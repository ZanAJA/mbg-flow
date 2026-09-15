import { apiFetch } from "@/shared/lib/api";

export function fetchLabel(deliveryBatchId: string) {
  return apiFetch(`/api/labels/${deliveryBatchId}`);
}
