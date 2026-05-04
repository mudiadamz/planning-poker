import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/**
 * Best-effort "I am leaving" endpoint hit via `navigator.sendBeacon` when
 * a tab/window is closed or hidden permanently. The browser guarantees
 * delivery of beacon requests even after the page unloads, where a normal
 * `fetch` from the unloading page would be cancelled mid-flight.
 *
 * We accept either JSON or `application/x-www-form-urlencoded` (the
 * default content type for `sendBeacon` Blob payloads varies, and Beacon
 * with a Blob lets you set whatever you like — we send JSON).
 *
 * No auth required: clients can already delete their own row through
 * RLS, and worst-case abuse is "kick a player you know the id of",
 * which the existing realtime UI already supports.
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

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("players")
    .delete()
    .eq("id", playerId)
    .eq("room_id", roomId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
