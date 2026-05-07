import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  JOIN_STALE_AFTER_SECONDS,
  MIN_STALE_AFTER_SECONDS,
  STALE_AFTER_SECONDS,
} from "@/lib/presenceConstants";

export const runtime = "nodejs";

/**
 * Server-side stale-player sweeper.
 *
 * Two entry points:
 *
 *   POST  { roomId, staleSeconds? }
 *     Per-room sweep, called by clients on room mount with the
 *     tighter `JOIN_STALE_AFTER_SECONDS` window so a long-abandoned
 *     room is fresh the moment a real visitor lands on it.
 *
 *   GET (with Authorization: Bearer <CLEANUP_CRON_SECRET>)
 *     Global sweep using the loose `STALE_AFTER_SECONDS` window.
 *     Wired up to Vercel Cron in `vercel.json` (see project root).
 *     Catches the "nobody is in any room to run client cleanup"
 *     case where ghosts otherwise survive indefinitely.
 *
 * Both run with the service role, which means they bypass RLS —
 * useful when the anon-key DELETE on `players` is blocked or
 * otherwise unreliable on a particular Supabase project.
 */

type RequestBody = {
  roomId?: unknown;
  staleSeconds?: unknown;
};

/**
 * Verify the request carries a valid cron bearer token. Accepts
 * either `CLEANUP_CRON_SECRET` (explicit, preferred) or Vercel's
 * default `CRON_SECRET` env var (which Vercel auto-attaches as
 * `Authorization: Bearer <CRON_SECRET>` on scheduled requests).
 *
 * Returns `null` if the request is authorized, or a NextResponse
 * with the appropriate error status otherwise.
 */
function checkCronAuth(req: Request): NextResponse | null {
  const cronSecret =
    process.env.CLEANUP_CRON_SECRET ?? process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      {
        error:
          "Scheduled / global cleanup is disabled. Set CLEANUP_CRON_SECRET (or CRON_SECRET on Vercel) to enable it.",
      },
      { status: 503 },
    );
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(req: Request) {
  let body: RequestBody | null = null;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    body = null;
  }

  const roomId =
    typeof body?.roomId === "string" && body.roomId.length > 0
      ? body.roomId
      : null;

  // Default to JOIN_STALE_AFTER_SECONDS (the tighter one). If a
  // periodic / external sweep wants the looser window, it can pass
  // STALE_AFTER_SECONDS explicitly.
  const requested =
    typeof body?.staleSeconds === "number" &&
    Number.isFinite(body.staleSeconds)
      ? Math.floor(body.staleSeconds)
      : JOIN_STALE_AFTER_SECONDS;
  const staleSeconds = Math.max(MIN_STALE_AFTER_SECONDS, requested);

  // Global sweeps (no roomId) are gated behind a shared secret so
  // they can't be triggered by anyone with the public URL. Per-room
  // sweeps are unauthenticated by design — anyone with the room link
  // can already DELETE players via the existing anon RLS policy, so
  // exposing the same scope through this route is no worse.
  if (!roomId) {
    const unauthorized = checkCronAuth(req);
    if (unauthorized) return unauthorized;
  }

  const cutoff = new Date(Date.now() - staleSeconds * 1000).toISOString();
  const admin = getSupabaseAdmin();

  let query = admin
    .from("players")
    .delete()
    .lt("last_seen", cutoff)
    .select("id");
  if (roomId) query = query.eq("room_id", roomId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    deleted: data?.length ?? 0,
    staleSeconds,
    scope: roomId ?? "global",
    looseStaleSeconds: STALE_AFTER_SECONDS,
  });
}

/**
 * Vercel Cron / external scheduler entry point. Fires periodically
 * (see `vercel.json`) and sweeps stale players across ALL rooms,
 * which is the only thing that catches ghosts in rooms with no
 * active client to run the per-room cleanup.
 *
 * Auth: `Authorization: Bearer <CLEANUP_CRON_SECRET>`. If the env
 * var isn't set, the route refuses — there is no "open by default"
 * mode for the global sweep.
 */
export async function GET(req: Request) {
  const unauthorized = checkCronAuth(req);
  if (unauthorized) return unauthorized;

  const cutoff = new Date(Date.now() - STALE_AFTER_SECONDS * 1000).toISOString();
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("players")
    .delete()
    .lt("last_seen", cutoff)
    .select("id");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    deleted: data?.length ?? 0,
    staleSeconds: STALE_AFTER_SECONDS,
    scope: "global",
  });
}
