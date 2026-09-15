"use client";

import { useEffect, useState } from "react";
import { deriveSafetyStatus, formatRemaining, remainingMs } from "@/shared/safety/engine";
import { cn } from "@/shared/lib/utils";

export function Countdown({
  safeUntil,
  serverNow,
  className,
}: {
  safeUntil: string | Date | null;
  serverNow: string;
  className?: string;
}) {
  const [now, setNow] = useState(() => new Date(serverNow).getTime());

  useEffect(() => {
    const origin = Date.now();
    const serverOrigin = new Date(serverNow).getTime();
    const tick = () => setNow(serverOrigin + (Date.now() - origin));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [serverNow]);

  const current = new Date(now);
  const remaining = remainingMs(safeUntil, current);
  const status = deriveSafetyStatus(safeUntil, current);

  const tone =
    status === "SAFE"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : status === "WARNING"
        ? "bg-amber-50 text-amber-900 ring-amber-300"
        : status === "PAST_LIMIT"
          ? "bg-red-50 text-red-800 ring-red-300"
          : "bg-muted text-muted-foreground ring-border";

  return (
    <div className={cn("rounded-xl px-4 py-3 ring-1", tone, className)}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-80">
        Countdown batas aman
      </p>
      <p className="font-mono text-2xl font-semibold tabular-nums">
        {formatRemaining(remaining)}
      </p>
      <p className="mt-1 text-xs">
        {status === "PENDING"
          ? "Timer mulai setelah komponen pangan selesai dimasak."
          : status === "PAST_LIMIT"
            ? "Batas aman konsumsi telah terlewati. Halaman ini tetap tersedia sebagai peringatan."
            : status === "WARNING"
              ? "Segera konsumsi atau distribusikan. Sisa waktu di bawah ambang peringatan."
              : "Masih dalam jendela aman sesuai ruleset tervalidasi."}
      </p>
    </div>
  );
}
