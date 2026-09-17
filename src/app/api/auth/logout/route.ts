import { cookies } from "next/headers";
import { SESSION_COOKIE, sessionCookieOptions } from "@/shared/auth/session";
import { jsonOk } from "@/shared/lib/http";

export async function POST() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", sessionCookieOptions(0));
  jar.delete(SESSION_COOKIE);
  return jsonOk({ ok: true });
}
