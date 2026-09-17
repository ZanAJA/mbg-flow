"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SAFE_WINDOW_MINUTES } from "@/shared/types/enums";
import { deriveSafetyStatus, formatRemaining, remainingMs } from "@/shared/safety/engine";
import { cn } from "@/shared/lib/utils";

const SIZES = {
  md: { size: 168, stroke: 10, time: "text-2xl", label: "text-xs" },
  sm: { size: 120, stroke: 8, time: "text-lg", label: "text-[10px]" },
} as const;

const TOTAL_MS = DEFAULT_SAFE_WINDOW_MINUTES * 60 * 1000;

export function Countdown({
  safeUntil,
  serverNow,
  className,
  size = "md",
  received = false,
}: {
  safeUntil: string | Date | null;
  serverNow: string;
  className?: string;
  size?: keyof typeof SIZES;
  /** When true and timer already expired, freeze display (no further ticks). */
  received?: boolean;
}) {
  const [now, setNow] = useState(() => new Date(serverNow).getTime());
  const dim = SIZES[size];
  const radius = (dim.size - dim.stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const initialRemaining = remainingMs(safeUntil, new Date(serverNow));
  const alreadyExpired = initialRemaining !== null && initialRemaining <= 0;

  useEffect(() => {
    if (alreadyExpired) {
      setNow(new Date(serverNow).getTime());
      return;
    }
    const origin = Date.now();
    const serverOrigin = new Date(serverNow).getTime();
    const tick = () => {
      const next = serverOrigin + (Date.now() - origin);
      const rem = remainingMs(safeUntil, new Date(next));
      setNow(next);
      // Stop ticking once we hit zero — avoid negative countdown.
      if (rem !== null && rem <= 0) {
        clearInterval(id);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [serverNow, safeUntil, alreadyExpired]);

  const current = new Date(now);
  const remaining = remainingMs(safeUntil, current);
  const clampedRemaining = remaining === null ? null : Math.max(0, remaining);
  const status = deriveSafetyStatus(safeUntil, current);

  const progress =
    clampedRemaining === null
      ? 0
      : clampedRemaining <= 0
        ? 0
        : Math.min(1, clampedRemaining / TOTAL_MS);

  const tone =
    status === "SAFE"
      ? { ring: "#059669", track: "#d1fae5", text: "text-emerald-800" }
      : status === "WARNING"
        ? { ring: "#d97706", track: "#fde68a", text: "text-amber-900" }
        : status === "PAST_LIMIT"
          ? { ring: "#dc2626", track: "#fecaca", text: "text-red-800" }
          : { ring: "#94a3b8", track: "#e2e8f0", text: "text-muted-foreground" };

  const label =
    status === "PENDING"
      ? "Menunggu"
      : status === "PAST_LIMIT"
        ? received
          ? "Selesai"
          : "Lewat"
        : status === "WARNING"
          ? "Waspada"
          : "Aman";

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="relative" style={{ width: dim.size, height: dim.size }}>
        <svg width={dim.size} height={dim.size} className="-rotate-90" aria-hidden>
          <circle
            cx={dim.size / 2}
            cy={dim.size / 2}
            r={radius}
            fill="none"
            stroke={tone.track}
            strokeWidth={dim.stroke}
          />
          <circle
            cx={dim.size / 2}
            cy={dim.size / 2}
            r={radius}
            fill="none"
            stroke={tone.ring}
            strokeWidth={dim.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            className="transition-[stroke-dashoffset] duration-700 ease-linear"
          />
        </svg>
        <div className={cn("absolute inset-0 flex flex-col items-center justify-center", tone.text)}>
          <p className={cn("font-mono font-semibold tabular-nums tracking-tight", dim.time)}>
            {clampedRemaining === null ? "--:--:--" : formatRemaining(clampedRemaining)}
          </p>
          <p className={cn("mt-0.5 font-medium uppercase tracking-wide opacity-70", dim.label)}>{label}</p>
        </div>
      </div>
    </div>
  );
}
