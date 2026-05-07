import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, isAdminToken } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/**
 * Admin: delete a room outright. The `players` FK has
 * `on delete cascade`, so all seats clear automatically. Realtime
 * fires DELETE events for both rooms and players, so connected
 * clients drop out of the room view (the room page already
 * handles `notFound` on a room DELETE).
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

  if (typeof roomId !== "string" || !roomId) {
    return NextResponse.json(
      { error: "roomId is required" },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("rooms")
    .delete()
    .eq("id", roomId)
    .select("id");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    deleted: data?.length ?? 0,
  });
}
