import type { ProductionStatus } from "@/shared/types/enums";

export function isAllocationValid(allocated: number, incoming: number, available: number) {
  return incoming > 0 && allocated + incoming <= available;
}

export function deriveProductionStatus(input: {
  components: { status: string }[];
  deliveryBatches: { status: string }[];
}): ProductionStatus {
  const allFinished =
    input.components.length > 0 && input.components.every((c) => c.status === "FINISHED");
  const anyStarted = input.components.some((c) => c.status !== "NOT_STARTED");
  const anyDeliveryReady = input.deliveryBatches.some(
    (d) => d.status === "READY" || d.status === "IN_DELIVERY" || d.status === "RECEIVED",
  );
  const allReceived =
    input.deliveryBatches.length > 0 &&
    input.deliveryBatches.every((d) => d.status === "RECEIVED");

  if (allReceived && allFinished) return "CLOSED";
  if (allFinished) return "PRODUCTION_COMPLETE";
  if (anyDeliveryReady) return "PARTIALLY_READY";
  if (anyStarted) return "IN_PRODUCTION";
  return "DRAFT";
}

export function etaFromDistanceKm(distanceKm: number) {
  return Math.max(12, Math.round(distanceKm * 3.4));
}
