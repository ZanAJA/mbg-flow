import { prisma } from "@/shared/db/prisma";
import { serializeDelivery } from "@/shared/domain/serializers";
import { handleApiError, HttpError, jsonOk, requireUser } from "@/shared/lib/http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser(["SUPERVISOR", "DISTRIBUTOR", "KITCHEN"]);
    const { id } = await context.params;
    const row = await prisma.deliveryBatch.findUnique({
      where: { id },
      include: {
        allocation: {
          include: {
            school: true,
            batch: {
              include: {
                menu: true,
                sppg: true,
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
