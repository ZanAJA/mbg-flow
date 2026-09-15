import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/shared/auth/session";
import { jsonOk } from "@/shared/lib/http";

export async function POST() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return jsonOk({ ok: true });
}
