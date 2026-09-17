import { z } from "zod";
import { prisma } from "@/shared/db/prisma";
import { distanceOrFallback } from "@/shared/lib/geo";
import { handleApiError, HttpError, jsonOk, requireUser, writeAudit } from "@/shared/lib/http";

const schoolSchema = z.object({
  name: z.string().trim().min(2).optional(),
  address: z.string().trim().min(4).optional(),
  lat: z.coerce.number().min(-90).max(90).nullable().optional(),
  lng: z.coerce.number().min(-180).max(180).nullable().optional(),
  distanceKm: z.coerce.number().min(0).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(["SUPERVISOR"]);
    const { id } = await context.params;
    const body = schoolSchema.parse(await request.json());
    const existing = await prisma.school.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Sekolah tidak ditemukan.");

    const sppg = await prisma.sppg.findUnique({ where: { id: user.sppgId } });
    const nextLat = body.lat !== undefined ? body.lat : existing.lat;
    const nextLng = body.lng !== undefined ? body.lng : existing.lng;
    const distanceKm =
      body.distanceKm ??
      distanceOrFallback({
        from: sppg,
        to: { lat: nextLat, lng: nextLng, distanceKm: existing.distanceKm },
      });

    const school = await prisma.school.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        address: body.address ?? existing.address,
        lat: nextLat,
        lng: nextLng,
        distanceKm,
      },
    });

    await writeAudit({
      actorUserId: user.id,
      action: "school_updated",
      entityType: "School",
      entityId: school.id,
      before: existing,
      after: school,
    });
    return jsonOk(school);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(["SUPERVISOR"]);
    const { id } = await context.params;
    const existing = await prisma.school.findUnique({
      where: { id },
      include: { allocations: { take: 1 } },
    });
    if (!existing) throw new HttpError(404, "Sekolah tidak ditemukan.");
    if (existing.allocations.length > 0) {
      throw new HttpError(409, "Sekolah sudah punya alokasi produksi, tidak bisa dihapus.");
    }

    await prisma.school.delete({ where: { id } });
    await writeAudit({
      actorUserId: user.id,
      action: "school_deleted",
      entityType: "School",
      entityId: id,
      before: existing,
    });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
