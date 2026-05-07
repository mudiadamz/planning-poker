import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, isAdminToken } from "@/lib/adminAuth";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 500;

/**
 * Admin broadcast: shouts a message into a room's Realtime channel
 * (`room:<roomId>`) using Supabase's HTTP broadcast endpoint, so the
 * server doesn't have to keep a websocket open.
 *
 * Connected clients listen for `event: 'message'` on the room
 * channel — the same event used by the in-room owner broadcaster.
 * The payload's `source` field distinguishes admin vs owner so the
 * client can style them differently if it wants.
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
  const rawMessage =
    body && typeof body === "object" && "message" in body
      ? (body as { message?: unknown }).message
      : undefined;
  const rawFrom =
    body && typeof body === "object" && "from" in body
      ? (body as { from?: unknown }).from
      : undefined;

  if (typeof roomId !== "string" || !roomId) {
    return NextResponse.json(
      { error: "roomId is required" },
      { status: 400 },
    );
  }
  if (typeof rawMessage !== "string" || !rawMessage.trim()) {
    return NextResponse.json(
      { error: "message is required" },
      { status: 400 },
    );
  }

  const message = rawMessage.trim().slice(0, MAX_MESSAGE_LENGTH);
  const from =
    typeof rawFrom === "string" && rawFrom.trim()
      ? rawFrom.trim().slice(0, 64)
      : "Admin";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      {
        error:
          "Server misconfigured: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.",
      },
      { status: 500 },
    );
  }

  const res = await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      messages: [
        {
          topic: `room:${roomId}`,
          event: "message",
          payload: {
            message,
            from,
            source: "admin",
            ts: new Date().toISOString(),
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `Realtime broadcast failed (${res.status}): ${text || "no body"}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
