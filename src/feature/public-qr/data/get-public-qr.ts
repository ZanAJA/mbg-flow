import { prisma } from "@/shared/db/prisma";
import { deriveSafetyStatus } from "@/shared/safety/engine";
import type { PublicQrPayload } from "@/feature/public-qr/types";

export async function getPublicQrByToken(token: string): Promise<PublicQrPayload | null> {
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
  if (!delivery) return null;

  const now = new Date();
  const snapshot = JSON.parse(delivery.allocation.batch.menuSnapshot) as {
    name?: string;
    durabilityNote?: string;
  };
  const batch = delivery.allocation.batch;
  const school = delivery.allocation.school;

  return {
    menuName: snapshot.name ?? batch.menu.name,
    durabilityNote: snapshot.durabilityNote ?? batch.menu.durabilityNote,
    sppgName: batch.sppg.name,
    sppgAddress: batch.sppg.address,
    schoolName: school.name,
    schoolAddress: school.address,
    portionQty: String(delivery.allocation.portionQty),
    portionType: batch.portionType,
    productionCode: batch.code,
    deliveryCode: delivery.code,
    safeUntil: batch.safeUntil ? batch.safeUntil.toISOString() : null,
    createdAt: (batch.readyAt ?? batch.createdAt).toISOString(),
    departedAt: delivery.departedAt ? delivery.departedAt.toISOString() : null,
    receivedAt: delivery.receivedAt ? delivery.receivedAt.toISOString() : null,
    productionStatus: batch.status,
    deliveryStatus: delivery.status,
    safetyStatus: deriveSafetyStatus(batch.safeUntil, now),
  };
}
