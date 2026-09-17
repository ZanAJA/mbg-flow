import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/shared/db/prisma";
import { signSession, SESSION_COOKIE } from "@/shared/auth/session";
import { handleApiError, jsonError, jsonOk } from "@/shared/lib/http";
import { JWT_TTL_SECONDS, ROLES, type Role } from "@/shared/types/enums";

const schema = z.object({
  name: z.string().trim().min(2, "Nama terlalu pendek"),
  email: z.string().email(),
  password: z.string().min(6, "Kata sandi minimal 6 karakter"),
  role: z.enum(ROLES),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const email = body.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return jsonError(409, "Email sudah terdaftar.");

    const sppg = await prisma.sppg.findFirst({ orderBy: { name: "asc" } });
    if (!sppg) return jsonError(500, "SPPG belum tersedia. Hubungi administrator.");

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email,
        passwordHash,
        role: body.role,
        sppgId: sppg.id,
      },
    });

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
