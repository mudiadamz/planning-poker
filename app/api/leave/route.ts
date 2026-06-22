import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/**
 * "I am leaving" beacon — hit via `navigator.sendBeacon` when a tab or
 * window is closed/refreshed. The browser guarantees beacon delivery
 * even after the page unloads, where a normal `fetch` from the
 * unloading page would be cancelled mid-flight.
 *
 * IMPORTANT: this is a SOFT leave — we do NOT delete the player row, and
 * we no longer touch `last_seen`. Instead we stamp an explicit `left_at`
 * marker. Why?
 *  - `pagehide` fires for both tab close AND page refresh, and we can't
 *    tell them apart at unload time.
 *  - The cleanup sweep removes rows where `left_at` is older than
 *    SOFT_LEAVE_GRACE_SECONDS. On a REFRESH, the new mount's presence
 *    upsert / first heartbeat clears `left_at` back to NULL well within
 *    the grace, so the row is never swept and no other client sees us
 *    leave. On a REAL close, `left_at` is never cleared, so the seat is
 *    freed within the grace window.
 *  - Backdating `last_seen` (the old approach) made a reloading row look
 *    ancient to the tight join-sweep window, which is exactly what let a
 *    refresh delete-and-recreate the row and shuffle room ownership.
 */

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

  // Stamp the leave marker. A refresh clears it on remount (presence
  // upsert / heartbeat); a real close leaves it set, so the sweep frees
  // the seat within SOFT_LEAVE_GRACE_SECONDS. `last_seen` is left alone.
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("pp_players")
    .update({ left_at: new Date().toISOString() })
    .eq("id", playerId)
    .eq("room_id", roomId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
