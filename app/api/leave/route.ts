import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { STALE_AFTER_SECONDS } from "@/lib/presenceConstants";

export const runtime = "nodejs";

/**
 * "I am leaving" beacon — hit via `navigator.sendBeacon` when a tab or
 * window is closed/refreshed. The browser guarantees beacon delivery
 * even after the page unloads, where a normal `fetch` from the
 * unloading page would be cancelled mid-flight.
 *
 * IMPORTANT: this is a SOFT leave — we do NOT delete the player row.
 * Why?
 *  - `pagehide` fires for both tab close AND page refresh, and we
 *    can't tell them apart at unload time.
 *  - If we deleted on every pagehide, every refresh would visibly
 *    kick the user out (others see leave/join blip; the user's own
 *    next mount would have to re-claim a deleted row).
 *
 * Instead, we slide `last_seen` just a few seconds shy of the stale
 * cutoff. That means:
 *  - On a refresh, the new mount fires its first heartbeat almost
 *    immediately, which resets `last_seen` to NOW — the row never
 *    looks stale, no other client ever sees us leave.
 *  - On a real close, no heartbeat ever comes back, so within the
 *    grace window the player tips into "stale" and the next periodic
 *    cleanup sweep removes them. (See `useStalePlayerCleanup` and
 *    `CLEANUP_INTERVAL_MS` for how fast that happens.)
 */

// Number of seconds the soft-leaver gets before they tip into "stale".
// Keep this comfortably above a typical refresh round-trip (mount +
// first heartbeat) so quick refreshes never get swept.
const SOFT_LEAVE_GRACE_SECONDS = 10;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    // sendBeacon may send Blob with text/plain — try as text JSON.
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : null;
    } catch {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
  }

  const roomId =
    typeof body === "object" && body !== null && "roomId" in body
      ? (body as { roomId?: unknown }).roomId
      : undefined;
  const playerId =
    typeof body === "object" && body !== null && "playerId" in body
      ? (body as { playerId?: unknown }).playerId
      : undefined;

  if (typeof roomId !== "string" || typeof playerId !== "string") {
    return NextResponse.json(
      { error: "roomId and playerId are required" },
      { status: 400 },
    );
  }

  // Backdate `last_seen` so the row stays present for at most
  // SOFT_LEAVE_GRACE_SECONDS unless a heartbeat (i.e. a refreshed page)
  // refreshes it back to NOW.
  const staleIn = SOFT_LEAVE_GRACE_SECONDS;
  const backdated = new Date(
    Date.now() - (STALE_AFTER_SECONDS - staleIn) * 1000,
  ).toISOString();

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("players")
    .update({ last_seen: backdated })
    .eq("id", playerId)
    .eq("room_id", roomId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
