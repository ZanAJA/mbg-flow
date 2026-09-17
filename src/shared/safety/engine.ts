import {
  DEFAULT_SAFE_WINDOW_MINUTES,
  WARNING_THRESHOLD_MINUTES,
  type SafetyStatus,
} from "@/shared/types/enums";

export type SafetyComponentInput = {
  affectsSafetyDeadline: boolean;
  finishedAt: Date | string | null;
  safeWindowMinutes: number;
  safeUntil?: Date | string | null;
};

export function addMinutes(from: Date, minutes: number) {
  return new Date(from.getTime() + minutes * 60 * 1000);
}

export function componentSafeUntil(input: {
  finishedAt: Date;
  safeWindowMinutes: number;
  affectsSafetyDeadline: boolean;
}): Date | null {
  if (!input.affectsSafetyDeadline) return null;
  const windowMinutes =
    input.safeWindowMinutes > 0 ? input.safeWindowMinutes : DEFAULT_SAFE_WINDOW_MINUTES;
  return addMinutes(input.finishedAt, windowMinutes);
}

export function productionBatchSafeUntil(components: SafetyComponentInput[]): Date | null {
  const deadlines = components
    .filter((component) => component.affectsSafetyDeadline)
    .map((component) => {
      if (component.safeUntil) return new Date(component.safeUntil);
      if (!component.finishedAt) return null;
      return componentSafeUntil({
        finishedAt: new Date(component.finishedAt),
        safeWindowMinutes: component.safeWindowMinutes,
        affectsSafetyDeadline: true,
      });
    })
    .filter((value): value is Date => Boolean(value));

  if (deadlines.length === 0) return null;
  return new Date(Math.min(...deadlines.map((d) => d.getTime())));
}

export function remainingMs(safeUntil: Date | string | null, now: Date) {
  if (!safeUntil) return null;
  return new Date(safeUntil).getTime() - now.getTime();
}

export function deriveSafetyStatus(
  safeUntil: Date | string | null,
  now: Date,
  warningMinutes = WARNING_THRESHOLD_MINUTES,
): SafetyStatus {
  if (!safeUntil) return "PENDING";
  const remaining = remainingMs(safeUntil, now);
  if (remaining === null) return "PENDING";
  if (remaining <= 0) return "PAST_LIMIT";
  if (remaining <= warningMinutes * 60 * 1000) return "WARNING";
  return "SAFE";
}

export function formatRemaining(ms: number | null) {
  if (ms === null) return "--:--:--";
  const sign = ms < 0 ? "-" : "";
  const abs = Math.abs(ms);
  const hours = Math.floor(abs / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  const seconds = Math.floor((abs % 60_000) / 1000);
  return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
