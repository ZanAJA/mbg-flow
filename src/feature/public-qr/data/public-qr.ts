import { apiFetch } from "@/shared/lib/api";
import type { PublicQrPayload } from "@/feature/public-qr/types";

export function fetchPublicQr(token: string) {
  return apiFetch<PublicQrPayload>(`/api/public/q/${token}`);
}
