import { z } from "zod";
import { prisma } from "@/shared/db/prisma";
import { handleApiError, HttpError, jsonOk, requireUser, writeAudit } from "@/shared/lib/http";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(["SUPERVISOR"]);
    const { id } = await context.params;
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) throw new HttpError(404, "Tim tidak ditemukan.");
    if (team.sppgId !== user.sppgId) throw new HttpError(403, "Tim di SPPG lain.");

    await prisma.team.delete({ where: { id } });
    await writeAudit({
      actorUserId: user.id,
      action: "team_deleted",
      entityType: "Team",
      entityId: id,
      before: team,
    });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

const patchSchema = z.object({
  name: z.string().trim().min(2).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(["SUPERVISOR"]);
    const { id } = await context.params;
    const body = patchSchema.parse(await request.json());
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) throw new HttpError(404, "Tim tidak ditemukan.");
    if (team.sppgId !== user.sppgId) throw new HttpError(403, "Tim di SPPG lain.");

    const updated = await prisma.team.update({
      where: { id },
      data: { name: body.name ?? team.name },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
        },
      },
    });
    await writeAudit({
      actorUserId: user.id,
      action: "team_updated",
      entityType: "Team",
      entityId: id,
      before: team,
      after: updated,
    });
    return jsonOk(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
