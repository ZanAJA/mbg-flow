import { prisma } from "@/shared/db/prisma";
import { serializeDelivery } from "@/shared/domain/serializers";
import { deliveryBatchScope } from "@/shared/domain/operational-scope";
import { handleApiError, HttpError, jsonOk, requireUser } from "@/shared/lib/http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(["SUPERVISOR", "DISTRIBUTOR", "KITCHEN"]);
    const { id } = await context.params;
    const row = await prisma.deliveryBatch.findFirst({
      where: { id, AND: [deliveryBatchScope(user)] },
      include: {
        allocation: {
          include: {
            school: true,
            batch: {
              include: {
                menu: true,
                sppg: true,
                productionLocation: true,
                kitchenTeam: true,
                driverTeam: true,
                components: true,
              },
            },
          },
        },
      },
    });
    if (!row) throw new HttpError(404, "Delivery batch tidak ditemukan.");
    return jsonOk(serializeDelivery(row));
  } catch (error) {
    return handleApiError(error);
  }
}
