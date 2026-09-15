import { apiFetch } from "@/shared/lib/api";

export function fetchLots() {
  return apiFetch("/api/ingredients/lots");
}
