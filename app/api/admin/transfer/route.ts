import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, isAdminToken } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/**
 * Admin: transfer room ownership to any player currently seated in
 * the room. Bypasses the regular `transfer_room_ownership` RPC
 * (which requires the caller to be the current owner) — admins act
 * "above" rooms and don't have a player_id.
 */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  if (!isAdminToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const roomId =
    body && typeof body === "object" && "roomId" in body
      ? (body as { roomId?: unknown }).roomId
      : undefined;
  const newOwnerId =
    body && typeof body === "object" && "newOwnerId" in body
      ? (body as { newOwnerId?: unknown }).newOwnerId
      : undefined;

  if (typeof roomId !== "string" || typeof newOwnerId !== "string") {
    return NextResponse.json(
      { error: "roomId and newOwnerId are required" },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();

  const { data: target, error: tErr } = await admin
    .from("players")
    .select("id")
    .eq("id", newOwnerId)
    .eq("room_id", roomId)
    .maybeSingle();
  if (tErr) {
    return NextResponse.json({ error: tErr.message }, { status: 500 });
  }
  if (!target) {
    return NextResponse.json(
      { error: "Player is not in this room" },
      { status: 404 },
    );
  }

  const { error } = await admin
    .from("rooms")
    .update({ owner_id: newOwnerId })
    .eq("id", roomId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
