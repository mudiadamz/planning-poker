import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, isAdminToken } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { STALE_AFTER_SECONDS } from "@/lib/presenceConstants";

export const runtime = "nodejs";

type RawPlayer = {
  id: string;
  room_id: string;
  name: string;
  vote: string | null;
  last_seen: string;
  joined_at: string;
};

type RawRoom = {
  id: string;
  name: string | null;
  deck: unknown;
  revealed: boolean;
  owner_id: string | null;
  created_at: string;
  players: RawPlayer[] | null;
};

/**
 * Admin rooms overview: every room with its full player list, the
 * effective owner (mirrors the SQL `current_room_owner` resolution),
 * and how many of those players are currently "active" — i.e. their
 * `last_seen` is within `STALE_AFTER_SECONDS`. Used by the admin
 * dashboard as the top-level navigation; clicking a room drills
 * into its voting history.
 */
export async function GET() {
  const cookieStore = await cookies();
  if (!isAdminToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("rooms")
    .select(
      "id, name, deck, revealed, owner_id, created_at, players(id, room_id, name, vote, last_seen, joined_at)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const cutoff = Date.now() - STALE_AFTER_SECONDS * 1000;

  const rooms = ((data as RawRoom[] | null) ?? []).map((r) => {
    const players = (r.players ?? [])
      .map((p) => ({
        id: p.id,
        name: p.name,
        vote: p.vote,
        last_seen: p.last_seen,
        joined_at: p.joined_at,
        active: new Date(p.last_seen).getTime() > cutoff,
      }))
      .sort((a, b) => a.joined_at.localeCompare(b.joined_at));

    // Mirror current_room_owner: explicit owner_id when that player
    // is still seated, else fall back to the earliest-joined player.
    let effectiveOwnerId: string | null = null;
    if (r.owner_id && players.some((p) => p.id === r.owner_id)) {
      effectiveOwnerId = r.owner_id;
    } else if (players.length > 0) {
      effectiveOwnerId = players[0].id;
    }

    return {
      id: r.id,
      name: r.name,
      revealed: r.revealed,
      owner_id: r.owner_id,
      effective_owner_id: effectiveOwnerId,
      created_at: r.created_at,
      players,
      total_count: players.length,
      active_count: players.filter((p) => p.active).length,
    };
  });

  return NextResponse.json({
    rooms,
    stale_after_seconds: STALE_AFTER_SECONDS,
  });
}
