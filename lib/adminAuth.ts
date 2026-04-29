import { timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE_NAME = "pp_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

/** Constant-time compare for the admin token. */
export function isAdminToken(token: string | undefined | null): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
