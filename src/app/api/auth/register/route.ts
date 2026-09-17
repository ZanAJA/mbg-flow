import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/shared/db/prisma";
import { signSession, SESSION_COOKIE, sessionCookieOptions } from "@/shared/auth/session";
import { handleApiError, jsonError, jsonOk } from "@/shared/lib/http";
import { ROLES, type Role } from "@/shared/types/enums";

const schema = z
  .object({
    name: z.string().trim().min(2, "Nama terlalu pendek"),
    email: z.string().email(),
    password: z.string().min(6, "Kata sandi minimal 6 karakter"),
    role: z.enum(ROLES),
    sppgName: z.string().trim().optional(),
    sppgAddress: z.string().trim().optional(),
    sppgLat: z.coerce.number().min(-90).max(90).optional(),
    sppgLng: z.coerce.number().min(-180).max(180).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.role !== "SUPERVISOR") return;
    if (!values.sppgName || values.sppgName.length < 2) {
      ctx.addIssue({ code: "custom", message: "Nama SPPG wajib diisi", path: ["sppgName"] });
    }
    if (!values.sppgAddress || values.sppgAddress.length < 4) {
      ctx.addIssue({ code: "custom", message: "Alamat SPPG wajib diisi", path: ["sppgAddress"] });
    }
    if (values.sppgLat == null) {
      ctx.addIssue({ code: "custom", message: "Latitude SPPG wajib diisi", path: ["sppgLat"] });
    }
    if (values.sppgLng == null) {
      ctx.addIssue({ code: "custom", message: "Longitude SPPG wajib diisi", path: ["sppgLng"] });
    }
  });

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const email = body.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return jsonError(409, "Email sudah terdaftar.");

    let sppgId: string;
    if (body.role === "SUPERVISOR") {
      const sppg = await prisma.sppg.create({
        data: {
          name: body.sppgName!,
          address: body.sppgAddress!,
          lat: body.sppgLat!,
          lng: body.sppgLng!,
        },
      });
      sppgId = sppg.id;
    } else {
      const sppg = await prisma.sppg.findFirst({ orderBy: { name: "asc" } });
      if (!sppg) return jsonError(500, "SPPG belum tersedia. Hubungi administrator.");
      sppgId = sppg.id;
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email,
        passwordHash,
        role: body.role,
        sppgId,
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
    jar.set(SESSION_COOKIE, token, sessionCookieOptions());

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
