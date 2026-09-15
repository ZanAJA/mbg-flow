import { apiFetch } from "@/shared/lib/api";

export function fetchPublicQr(token: string) {
  return apiFetch(`/api/public/q/${token}`);
}
