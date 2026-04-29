import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, isAdminToken } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  if (!isAdminToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const url = new URL(req.url);
  const roomId = url.searchParams.get("room_id");
  const limitParam = parseInt(url.searchParams.get("limit") ?? "100", 10);
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 500)
    : 100;

  const admin = getSupabaseAdmin();
  let query = admin
    .from("voting_rounds")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (roomId) query = query.eq("room_id", roomId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rounds: data ?? [] });
}
