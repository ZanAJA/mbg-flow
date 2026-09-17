import { z } from "zod";
import { prisma } from "@/shared/db/prisma";
import { handleApiError, HttpError, jsonOk, requireUser, writeAudit } from "@/shared/lib/http";

const patchSchema = z.object({
  name: z.string().trim().min(2).optional(),
  address: z.string().trim().min(4).optional(),
  lat: z.coerce.number().min(-90).max(90).nullable().optional(),
  lng: z.coerce.number().min(-180).max(180).nullable().optional(),
});

export async function GET() {
  try {
    const user = await requireUser(["SUPERVISOR", "KITCHEN", "DISTRIBUTOR"]);
    const sppg = await prisma.sppg.findUnique({ where: { id: user.sppgId } });
    if (!sppg) throw new HttpError(404, "SPPG tidak ditemukan.");
    return jsonOk(sppg);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser(["SUPERVISOR"]);
    const body = patchSchema.parse(await request.json());
    const existing = await prisma.sppg.findUnique({ where: { id: user.sppgId } });
    if (!existing) throw new HttpError(404, "SPPG tidak ditemukan.");

    const sppg = await prisma.sppg.update({
      where: { id: user.sppgId },
      data: {
        name: body.name ?? existing.name,
        address: body.address ?? existing.address,
        lat: body.lat !== undefined ? body.lat : existing.lat,
        lng: body.lng !== undefined ? body.lng : existing.lng,
      },
    });

    await writeAudit({
      actorUserId: user.id,
      action: "sppg_updated",
      entityType: "Sppg",
      entityId: sppg.id,
      before: existing,
      after: sppg,
    });
    return jsonOk(sppg);
  } catch (error) {
    return handleApiError(error);
  }
}
