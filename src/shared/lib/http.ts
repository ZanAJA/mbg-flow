import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ZodError } from "zod";
import { prisma } from "@/shared/db/prisma";
import { verifySessionToken, SESSION_COOKIE, type SessionUser } from "@/shared/auth/session";
import { assertRole } from "@/shared/auth/rbac";
import type { Role } from "@/shared/types/enums";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(
    { data, serverNow: new Date().toISOString() },
    init,
  );
}

export function jsonError(status: number, message: string) {
  return NextResponse.json(
    { error: message, serverNow: new Date().toISOString() },
    { status },
  );
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireUser(roles?: Role[]) {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "Anda perlu masuk terlebih dahulu.");
  if (roles) assertRole(user.role, roles);
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.active) throw new HttpError(401, "Akun tidak aktif.");
  return user;
}

export function handleApiError(error: unknown) {
  if (error instanceof HttpError) return jsonError(error.status, error.message);
  if (error instanceof ZodError) {
    const message = error.issues[0]?.message ?? "Data permintaan tidak valid.";
    return jsonError(400, message);
  }
  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error as { status: number }).status) || 400;
    return jsonError(status, error instanceof Error ? error.message : "Permintaan ditolak.");
  }
  const message = error instanceof Error ? error.message : "";
  if (
    message.includes("Can't reach database server") ||
    message.includes("P1001") ||
    (error && typeof error === "object" && "name" in error && (error as { name: string }).name === "PrismaClientInitializationError")
  ) {
    console.error(error);
    return jsonError(503, "Database tidak tersedia. Pastikan PostgreSQL berjalan di localhost:5432.");
  }
  console.error(error);
  return jsonError(500, "Terjadi kesalahan server.");
}

export async function writeAudit(input: {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      beforeJson: input.before ? JSON.stringify(input.before) : null,
      afterJson: input.after ? JSON.stringify(input.after) : null,
      reason: input.reason ?? null,
    },
  });
}
