import { NextResponse } from "next/server";

import {
  ADMIN_COOKIE_MAX_AGE,
  ADMIN_COOKIE_NAME,
  isAdminToken,
} from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const password =
    typeof body === "object" && body !== null && "password" in body
      ? (body as { password?: unknown }).password
      : undefined;

  if (typeof password !== "string" || !isAdminToken(password)) {
    return NextResponse.json(
      { error: "Password salah." },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, password, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return res;
}
