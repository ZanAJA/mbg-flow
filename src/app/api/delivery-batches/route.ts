import { prisma } from "@/shared/db/prisma";
import { serializeDelivery } from "@/shared/domain/serializers";
import { deliveryBatchScope } from "@/shared/domain/operational-scope";
import { handleApiError, jsonOk, requireUser } from "@/shared/lib/http";

export async function GET() {
  try {
    const user = await requireUser(["SUPERVISOR", "DISTRIBUTOR"]);
    const now = new Date();
    const rows = await prisma.deliveryBatch.findMany({
      where: deliveryBatchScope(user),
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
              },
            },
          },
        },
      },
      orderBy: { code: "asc" },
    });
    const ranked = [...rows].sort((a, b) => {
      const readyScore = Number(a.status === "READY") - Number(b.status === "READY");
      if (readyScore !== 0) return readyScore;
      return b.allocation.school.distanceKm - a.allocation.school.distanceKm;
    });
    return jsonOk(
      ranked.map((row, index) => ({
        ...serializeDelivery(row, now),
        recommendOrder: index + 1,
      })),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
