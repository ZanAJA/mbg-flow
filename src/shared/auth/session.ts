import { SignJWT, jwtVerify } from "jose";
import { JWT_TTL_SECONDS, SESSION_COOKIE, type Role } from "@/shared/types/enums";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  sppgId: string;
};

/** Shared cookie attrs so set/clear always target the same cookie. */
export function sessionCookieOptions(maxAge = JWT_TTL_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    secure: process.env.NODE_ENV === "production",
  };
}

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET harus di-set di production.");
    }
    return new TextEncoder().encode("mbg-mvp-dev-secret-change-in-production");
  }
  return new TextEncoder().encode(value);
}

export async function signSession(user: SessionUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${JWT_TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (
      typeof payload.id !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.sppgId !== "string"
    ) {
      return null;
    }
    return {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role as Role,
      sppgId: payload.sppgId,
    };
  } catch {
    return null;
  }
}

export { SESSION_COOKIE };
