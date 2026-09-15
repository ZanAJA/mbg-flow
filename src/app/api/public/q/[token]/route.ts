import { prisma } from "@/shared/db/prisma";
import { deriveSafetyStatus } from "@/shared/safety/engine";
import { jsonError, jsonOk } from "@/shared/lib/http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const delivery = await prisma.deliveryBatch.findUnique({
    where: { qrToken: token },
    include: {
      allocation: {
        include: {
          school: true,
          batch: { include: { menu: true, sppg: true } },
        },
      },
    },
  });
  if (!delivery) return jsonError(404, "Token QR tidak valid.");

  const now = new Date();
  const snapshot = JSON.parse(delivery.allocation.batch.menuSnapshot) as { name?: string };
  const payload = {
    menuName: snapshot.name ?? delivery.allocation.batch.menu.name,
    sppgName: delivery.allocation.batch.sppg.name,
    schoolName: delivery.allocation.school.name,
    portionQty: delivery.allocation.portionQty,
    productionCode: delivery.allocation.batch.code,
    deliveryCode: delivery.code,
    safeUntil: delivery.allocation.batch.safeUntil,
    receivedAt: delivery.receivedAt,
    productionStatus: delivery.allocation.batch.status,
    deliveryStatus: delivery.status,
    safetyStatus: deriveSafetyStatus(delivery.allocation.batch.safeUntil, now),
  };

  return jsonOk(payload);
}
