import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/shared/db/prisma";
import { signSession, SESSION_COOKIE } from "@/shared/auth/session";
import { handleApiError, jsonError, jsonOk } from "@/shared/lib/http";
import { JWT_TTL_SECONDS, type Role } from "@/shared/types/enums";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(3),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user || !user.active) return jsonError(401, "Email atau kata sandi salah.");
    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) return jsonError(401, "Email atau kata sandi salah.");

    const token = await signSession({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as Role,
      sppgId: user.sppgId,
    });
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: JWT_TTL_SECONDS,
      secure: process.env.NODE_ENV === "production",
    });
    return jsonOk({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
