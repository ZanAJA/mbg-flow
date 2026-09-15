import { apiFetch } from "@/shared/lib/api";

export function fetchDeliveryBatches() {
  return apiFetch("/api/delivery-batches");
}
