import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, isAdminToken } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/**
 * Admin: kick (delete) a player from a room. Service-role delete so
 * RLS / room-owner checks don't apply — admins can kick anyone,
 * including the current owner. Realtime fires the row-level DELETE
 * event so connected clients update their seats automatically.
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
  const playerId =
    body && typeof body === "object" && "playerId" in body
      ? (body as { playerId?: unknown }).playerId
      : undefined;

  if (typeof roomId !== "string" || typeof playerId !== "string") {
    return NextResponse.json(
      { error: "roomId and playerId are required" },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("players")
    .delete()
    .eq("id", playerId)
    .eq("room_id", roomId)
    .select("id");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    deleted: data?.length ?? 0,
  });
}
