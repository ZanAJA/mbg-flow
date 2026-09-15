import { TIMEZONE } from "@/shared/types/enums";

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TIMEZONE,
    dateStyle: "medium",
  }).format(new Date(value));
}

export function daysUntil(value: Date | string) {
  const target = new Date(value).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / 86_400_000);
}
