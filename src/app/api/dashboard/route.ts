import { prisma } from "@/shared/db/prisma";
import { deriveSafetyStatus } from "@/shared/safety/engine";
import { daysUntil, jakartaDayBounds } from "@/shared/lib/format";
import { handleApiError, jsonOk, requireUser } from "@/shared/lib/http";
import { serializeBatch, serializeDelivery } from "@/shared/domain/serializers";
import { deliveryBatchScope, productionBatchScope } from "@/shared/domain/operational-scope";

export async function GET() {
  try {
    const user = await requireUser(["SUPERVISOR", "KITCHEN", "DISTRIBUTOR"]);
    const now = new Date();
    const { start, end } = jakartaDayBounds(now);
    const [batches, deliveries, lots] = await Promise.all([
      prisma.productionBatch.findMany({
        where: {
          AND: [productionBatchScope(user)],
          status: { not: "CLOSED" },
          date: { gte: start, lte: end },
        },
        include: {
          menu: true,
          sppg: true,
          productionLocation: true,
          kitchenTeam: true,
          driverTeam: true,
          components: true,
          allocations: { include: { school: true, deliveryBatch: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.deliveryBatch.findMany({
        where: {
          AND: [deliveryBatchScope(user)],
          allocation: { batch: { date: { gte: start, lte: end } } },
        },
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
      }),
      prisma.ingredientLot.findMany({ include: { ingredient: true } }),
    ]);

    const expiryWarnings = lots
      .filter((lot) => daysUntil(lot.expiryDate) <= 3)
      .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());

    const deadlineWarnings = deliveries.filter((row) => {
      const status = deriveSafetyStatus(row.allocation.batch.safeUntil, now);
      return (status === "WARNING" || status === "PAST_LIMIT") && row.status !== "RECEIVED";
    });

    return jsonOk({
      role: user.role,
      productionBatches: batches.map((b) => serializeBatch(b, now)),
      deliveries: deliveries.map((d) => serializeDelivery(d, now)),
      expiryWarnings,
      deadlineWarnings: deadlineWarnings.map((d) => serializeDelivery(d, now)),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
