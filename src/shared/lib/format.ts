import { TIMEZONE } from "@/shared/types/enums";

/** Local `YYYY-MM-DDTHH:mm` for `<input type="datetime-local">` (not UTC ISO). */
export function toLocalDatetimeValue(value: Date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

/** Start/end of the Asia/Jakarta calendar day containing `now`, as Date bounds for queries. */
export function jakartaDayBounds(now: Date = new Date()) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  // Asia/Jakarta is UTC+7 year-round (no DST).
  const start = new Date(`${day}T00:00:00+07:00`);
  const end = new Date(`${day}T23:59:59.999+07:00`);
  return { start, end, day };
}

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
