import { apiFetch } from "@/shared/lib/api";

export function fetchProductionBatches() {
  return apiFetch("/api/production-batches");
}
