import { apiFetch } from "@/shared/lib/api";

export function fetchBatches() {
  return apiFetch("/api/production-batches");
}
