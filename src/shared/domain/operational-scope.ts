import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/shared/auth/session";
import { prisma } from "@/shared/db/prisma";
import { HttpError } from "@/shared/lib/http";

export function productionBatchScope(user: SessionUser): Prisma.ProductionBatchWhereInput {
  if (user.role === "SUPERVISOR") return { sppgId: user.sppgId };

  const teamRelation = user.role === "KITCHEN" ? "kitchenTeam" : "driverTeam";
  const teamIdField = user.role === "KITCHEN" ? "kitchenTeamId" : "driverTeamId";

  return {
    sppgId: user.sppgId,
    OR: [
      { [teamIdField]: null },
      { [teamRelation]: { members: { some: { userId: user.id } } } },
    ],
  };
}

export function deliveryBatchScope(user: SessionUser): Prisma.DeliveryBatchWhereInput {
  return { allocation: { batch: productionBatchScope(user) } };
}

export async function assertProductionBatchAccess(user: SessionUser, batchId: string) {
  const batch = await prisma.productionBatch.findFirst({
    where: { id: batchId, AND: [productionBatchScope(user)] },
    select: { id: true },
  });
  if (!batch) throw new HttpError(404, "Production batch tidak ditemukan.");
}

export async function assertComponentAccess(user: SessionUser, componentId: string) {
  const component = await prisma.productionComponent.findFirst({
    where: { id: componentId, batch: productionBatchScope(user) },
    select: { id: true },
  });
  if (!component) throw new HttpError(404, "Komponen tidak ditemukan.");
}

export async function assertAllocationAccess(user: SessionUser, allocationId: string) {
  const allocation = await prisma.schoolAllocation.findFirst({
    where: { id: allocationId, batch: productionBatchScope(user) },
    select: { id: true },
  });
  if (!allocation) throw new HttpError(404, "Alokasi tidak ditemukan.");
}

export async function assertDeliveryAccess(user: SessionUser, deliveryId: string) {
  const delivery = await prisma.deliveryBatch.findFirst({
    where: { id: deliveryId, AND: [deliveryBatchScope(user)] },
    select: { id: true },
  });
  if (!delivery) throw new HttpError(404, "Delivery batch tidak ditemukan.");
}
