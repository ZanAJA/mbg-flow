import type { DeliveryStatus, ProductionStatus, SafetyStatus } from "@/shared/types/enums";
import { deriveSafetyStatus } from "@/shared/safety/engine";

export function withSafety<T extends { safeUntil?: Date | string | null }>(
  entity: T,
  now = new Date(),
): T & { safetyStatus: SafetyStatus } {
  return {
    ...entity,
    safetyStatus: deriveSafetyStatus(entity.safeUntil ?? null, now),
  };
}

export function serializeBatch<T extends {
  safeUntil?: Date | string | null;
  status: string;
}>(batch: T, now = new Date()) {
  return {
    ...batch,
    productionStatus: batch.status as ProductionStatus,
    safetyStatus: deriveSafetyStatus(batch.safeUntil ?? null, now),
  };
}

export function serializeDelivery<T extends {
  status: string;
  allocation?: { batch?: { safeUntil?: Date | string | null } };
}>(delivery: T, now = new Date()) {
  const safeUntil = delivery.allocation?.batch?.safeUntil ?? null;
  return {
    ...delivery,
    deliveryStatus: delivery.status as DeliveryStatus,
    safetyStatus: deriveSafetyStatus(safeUntil, now),
  };
}

export const PUBLIC_QR_FIELDS = [
  "menuName",
  "sppgName",
  "schoolName",
  "portionQty",
  "productionCode",
  "deliveryCode",
  "safeUntil",
  "receivedAt",
  "safetyStatus",
  "productionStatus",
  "deliveryStatus",
] as const;
