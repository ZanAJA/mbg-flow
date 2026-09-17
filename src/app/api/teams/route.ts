import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/shared/db/prisma";
import { handleApiError, jsonOk, requireUser, writeAudit } from "@/shared/lib/http";

function inviteCode() {
  return randomBytes(3).toString("hex").toUpperCase();
}

const createSchema = z.object({
  name: z.string().trim().min(2, "Nama tim terlalu pendek"),
});

export async function GET() {
  try {
    const user = await requireUser(["SUPERVISOR", "KITCHEN", "DISTRIBUTOR"]);
    const teams = await prisma.team.findMany({
      where: { sppgId: user.sppgId },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
          orderBy: { joinedAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return jsonOk(teams);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(["SUPERVISOR"]);
    const body = createSchema.parse(await request.json());

    let code = inviteCode();
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.team.findUnique({ where: { inviteCode: code } });
      if (!exists) break;
      code = inviteCode();
    }

    const team = await prisma.team.create({
      data: {
        name: body.name,
        sppgId: user.sppgId,
        createdById: user.id,
        inviteCode: code,
        members: {
          create: { userId: user.id },
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
        },
      },
    });

    await writeAudit({
      actorUserId: user.id,
      action: "team_created",
      entityType: "Team",
      entityId: team.id,
      after: { name: team.name, inviteCode: team.inviteCode },
    });

    return jsonOk(team, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
