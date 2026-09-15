import { apiFetch } from "@/shared/lib/api";
import type { SessionShape } from "@/shared/components/session-types";

export function fetchMe() {
  return apiFetch<SessionShape>("/api/auth/me");
}
