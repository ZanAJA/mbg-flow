import { apiFetch } from "@/shared/lib/api";

export function fetchDashboard() {
  return apiFetch("/api/dashboard");
}
