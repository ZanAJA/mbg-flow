import { prisma } from "@/shared/db/prisma";
import { serializeBatch } from "@/shared/domain/serializers";
import { handleApiError, HttpError, jsonOk, requireUser } from "@/shared/lib/http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser(["SUPERVISOR", "KITCHEN", "DISTRIBUTOR"]);
    const { id } = await context.params;
    const batch = await prisma.productionBatch.findUnique({
      where: { id },
      include: {
        menu: true,
        sppg: true,
        components: { orderBy: { sortOrder: "asc" } },
        allocations: { include: { school: true, deliveryBatch: true } },
      },
    });
    if (!batch) throw new HttpError(404, "Production batch tidak ditemukan.");
    return jsonOk(serializeBatch(batch));
  } catch (error) {
    return handleApiError(error);
  }
}
