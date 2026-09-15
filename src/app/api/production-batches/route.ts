import { z } from "zod";
import { prisma } from "@/shared/db/prisma";
import { createProductionBatch } from "@/shared/domain/production";
import { serializeBatch } from "@/shared/domain/serializers";
import { handleApiError, jsonOk, requireUser } from "@/shared/lib/http";

const createSchema = z.object({
  menuId: z.string().min(1),
  portionType: z.enum(["BESAR", "KECIL"]),
  targetQty: z.number().int().positive(),
});

export async function GET() {
  try {
    await requireUser(["SUPERVISOR", "KITCHEN", "DISTRIBUTOR"]);
    const now = new Date();
    const batches = await prisma.productionBatch.findMany({
      include: {
        menu: true,
        sppg: true,
        components: { orderBy: { sortOrder: "asc" } },
        allocations: { include: { school: true, deliveryBatch: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return jsonOk(batches.map((batch) => serializeBatch(batch, now)));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(["SUPERVISOR", "KITCHEN"]);
    const body = createSchema.parse(await request.json());
    const batch = await createProductionBatch({
      ...body,
      sppgId: user.sppgId,
      actorUserId: user.id,
    });
    return jsonOk(serializeBatch(batch), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
