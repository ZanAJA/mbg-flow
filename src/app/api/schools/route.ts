import { z } from "zod";
import { prisma } from "@/shared/db/prisma";
import { distanceOrFallback } from "@/shared/lib/geo";
import { handleApiError, HttpError, jsonOk, requireUser, writeAudit } from "@/shared/lib/http";

const schoolSchema = z.object({
  name: z.string().trim().min(2, "Nama sekolah terlalu pendek"),
  address: z.string().trim().min(4, "Alamat terlalu pendek"),
  lat: z.coerce.number().min(-90).max(90).nullable().optional(),
  lng: z.coerce.number().min(-180).max(180).nullable().optional(),
  distanceKm: z.coerce.number().min(0).optional(),
});

export async function GET() {
  try {
    await requireUser(["SUPERVISOR", "KITCHEN", "DISTRIBUTOR"]);
    const schools = await prisma.school.findMany({ orderBy: { name: "asc" } });
    return jsonOk(schools);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(["SUPERVISOR"]);
    const body = schoolSchema.parse(await request.json());
    const sppg = await prisma.sppg.findUnique({ where: { id: user.sppgId } });
    if (!sppg) throw new HttpError(404, "SPPG tidak ditemukan.");

    const distanceKm =
      body.distanceKm ??
      distanceOrFallback({
        from: sppg,
        to: { lat: body.lat ?? null, lng: body.lng ?? null, distanceKm: 0 },
      });

    const school = await prisma.school.create({
      data: {
        name: body.name,
        address: body.address,
        lat: body.lat ?? null,
        lng: body.lng ?? null,
        distanceKm,
      },
    });

    await writeAudit({
      actorUserId: user.id,
      action: "school_created",
      entityType: "School",
      entityId: school.id,
      after: school,
    });
    return jsonOk(school, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
