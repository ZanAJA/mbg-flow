import { z } from "zod";
import { prisma } from "@/shared/db/prisma";
import { handleApiError, jsonOk, requireUser, writeAudit } from "@/shared/lib/http";

const createSchema = z.object({
  name: z.string().trim().min(2, "Nama lokasi terlalu pendek"),
  address: z.string().trim().min(4, "Alamat terlalu pendek"),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser(["SUPERVISOR"]);
    const body = createSchema.parse(await request.json());
    const location = await prisma.productionLocation.create({
      data: { ...body, sppgId: user.sppgId },
    });

    await writeAudit({
      actorUserId: user.id,
      action: "production_location_created",
      entityType: "ProductionLocation",
      entityId: location.id,
      after: location,
    });

    return jsonOk(location, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
