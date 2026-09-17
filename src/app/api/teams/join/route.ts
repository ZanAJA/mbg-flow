import { z } from "zod";
import { prisma } from "@/shared/db/prisma";
import { handleApiError, HttpError, jsonOk, requireUser, writeAudit } from "@/shared/lib/http";

const joinSchema = z.object({
  inviteCode: z.string().trim().min(4, "Kode undangan tidak valid"),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser(["SUPERVISOR", "KITCHEN", "DISTRIBUTOR"]);
    const body = joinSchema.parse(await request.json());
    const code = body.inviteCode.trim().toUpperCase();

    const team = await prisma.team.findUnique({
      where: { inviteCode: code },
      include: { members: true },
    });
    if (!team) throw new HttpError(404, "Kode undangan tidak ditemukan.");
    if (team.sppgId !== user.sppgId) {
      throw new HttpError(403, "Tim ini berada di SPPG lain.");
    }
    if (team.members.some((m) => m.userId === user.id)) {
      throw new HttpError(409, "Anda sudah bergabung di tim ini.");
    }

    const member = await prisma.teamMember.create({
      data: { teamId: team.id, userId: user.id },
      include: {
        team: {
          include: {
            members: {
              include: { user: { select: { id: true, name: true, email: true, role: true } } },
            },
          },
        },
      },
    });

    await writeAudit({
      actorUserId: user.id,
      action: "team_joined",
      entityType: "Team",
      entityId: team.id,
      after: { userId: user.id, inviteCode: code },
    });

    return jsonOk(member.team, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
