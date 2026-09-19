"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import {
  CheckCircle2,
  Circle,
  MapPin,
  Package,
  ShieldAlert,
  Truck,
} from "lucide-react";
import { apiFetch } from "@/shared/lib/api";
import { Countdown } from "@/shared/components/countdown";
import { SafetyBadge } from "@/shared/components/status-badges";
import { formatDateTime } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import type { PublicQrPayload } from "@/feature/public-qr/types";

const SAFETY_COPY: Record<string, { title: string; body: string }> = {
  SAFE: {
    title: "Masih dalam batas aman",
    body: "Makanan boleh dikonsumsi. Tetap jaga kebersihan dan perhatikan sisa waktu di bawah.",
  },
  WARNING: {
    title: "Mendekati batas aman",
    body: "Segera bagikan atau konsumsi. Jika aroma atau tampilan tidak normal, jangan dikonsumsi.",
  },
  PAST_LIMIT: {
    title: "Lewat batas aman konsumsi",
    body: "Jangan dibagikan. Laporkan ke sekolah atau petugas SPPG untuk tindak lanjut.",
  },
  PENDING: {
    title: "Batas aman belum dihitung",
    body: "Produksi belum selesai mencatat waktu siap. Status akan muncul otomatis.",
  },
};

const DELIVERY_LABEL: Record<string, string> = {
  PLANNED: "Direncanakan",
  READY: "Siap berangkat",
  IN_DELIVERY: "Dalam pengiriman",
  RECEIVED: "Diterima sekolah",
};

function formatActivityTime(value: string | null | undefined) {
  if (!value) return null;
  return formatDateTime(value);
}

function TimelineStep({
  icon: Icon,
  label,
  time,
  done,
  active,
  isLast,
}: {
  icon: typeof Package;
  label: string;
  time: string | null;
  done: boolean;
  active: boolean;
  isLast?: boolean;
}) {
  return (
    <div className="relative flex gap-3 pb-5 last:pb-0">
      {!isLast ? (
        <span
          className={cn(
            "absolute top-8 bottom-0 left-[15px] w-px",
            done ? "bg-emerald-500/50" : "bg-foreground/10",
          )}
          aria-hidden
        />
      ) : null}
      <div
        className={cn(
          "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full",
          done
            ? "bg-emerald-600 text-white"
            : active
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
        )}
      >
        {done ? <CheckCircle2 className="size-4" /> : <Icon className="size-4" />}
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className={cn("text-sm font-medium", done || active ? "text-foreground" : "text-muted-foreground")}>
          {label}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {time ?? (done || active ? "Sedang berlangsung" : "Belum tercatat")}
        </p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-foreground/8 py-3 last:border-b-0">
      <p className="shrink-0 text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="text-right text-sm font-medium text-balance text-foreground">{value}</p>
    </div>
  );
}

export function PublicQrContainer({
  token,
  initialData,
  initialServerNow,
  initialError,
}: {
  token: string;
  initialData: PublicQrPayload | null;
  initialServerNow: string;
  initialError: string | null;
}) {
  const query = useQuery({
    queryKey: ["public-qr", token],
    queryFn: () => apiFetch<PublicQrPayload>(`/api/public/q/${token}`),
    refetchInterval: 5_000,
    enabled: Boolean(token),
    initialData: initialData
      ? { data: initialData, serverNow: initialServerNow }
      : undefined,
    retry: 2,
  });

  const data = query.data?.data ?? initialData;
  const serverNow = query.data?.serverNow ?? initialServerNow;
  const errorMessage = query.error?.message ?? (data ? null : initialError);
  const safety = data?.safetyStatus ?? "PENDING";
  const tone =
    safety === "SAFE"
      ? "from-emerald-100/80 via-[#f4f7fb] to-[#eef3f8]"
      : safety === "WARNING"
        ? "from-amber-100/90 via-[#f8f5ef] to-[#f4f7fb]"
        : safety === "PAST_LIMIT"
          ? "from-red-100/90 via-[#faf4f4] to-[#f4f7fb]"
          : "from-[#dce7f4] via-[#f4f7fb] to-[#eef3f8]";

  const madeAt = formatActivityTime(data?.createdAt);
  const sentAt = formatActivityTime(data?.departedAt);
  const receivedAt = formatActivityTime(data?.receivedAt);
  const isReceived = data?.deliveryStatus === "RECEIVED";
  const isInDelivery = data?.deliveryStatus === "IN_DELIVERY" || Boolean(data?.departedAt);
  const isReady = Boolean(data?.createdAt);

  return (
    <div className={cn("min-h-screen overflow-x-clip bg-linear-to-b", tone)}>
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg border text-primary-foreground">
            <Image src="/logo-mbgflow.png" alt="Logo MBG Flow" width={24} height={24} />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">MBG Flow</p>
            <p className="text-[11px] text-muted-foreground">Cek status makanan</p>
          </div>
        </div>
        {data ? <SafetyBadge status={data.safetyStatus} /> : null}
      </header>

      <main className="mx-auto w-full max-w-lg px-4 pb-10 sm:px-6">
        {!data && !errorMessage ? (
          <div className="space-y-4 py-16 text-center">
            <div className="mx-auto size-10 animate-pulse rounded-full bg-primary/15" />
            <p className="text-sm text-muted-foreground">Memuat status batch dari QR...</p>
          </div>
        ) : null}

        {errorMessage && !data ? (
          <div className="mt-8 rounded-2xl border border-destructive/20 bg-background/90 px-5 py-8 text-center shadow-sm">
            <ShieldAlert className="mx-auto size-10 text-destructive" />
            <h1 className="mt-4 text-xl font-semibold tracking-tight">QR tidak valid</h1>
            <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
          </div>
        ) : null}

        {data ? (
          <div className="space-y-4">
            <section className="overflow-hidden rounded-2xl bg-[#0b1f3a] px-5 py-6 text-white shadow-sm">
              <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-white/65">
                Hasil scan QR
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-balance">{data.menuName}</h1>
              <p className="mt-2 text-sm text-white/80">
                {data.portionQty} porsi {data.portionType === "BESAR" ? "besar" : "kecil"} · {data.schoolName}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs text-white">
                  {DELIVERY_LABEL[data.deliveryStatus] ?? data.deliveryStatus}
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/85">
                  {data.deliveryCode}
                </span>
              </div>
            </section>

            <section className="rounded-2xl bg-background/90 px-4 py-5 shadow-sm ring-1 ring-foreground/8 backdrop-blur">
              <div className="mb-4 text-center">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Countdown batas aman
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight">
                  {SAFETY_COPY[safety]?.title ?? SAFETY_COPY.PENDING.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground text-pretty">
                  {SAFETY_COPY[safety]?.body ?? SAFETY_COPY.PENDING.body}
                </p>
              </div>
              <div className="flex justify-center py-1">
                <Countdown
                  safeUntil={data.safeUntil}
                  serverNow={serverNow}
                  received={isReceived}
                />
              </div>
              {data.safeUntil ? (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Batas aman: {formatDateTime(data.safeUntil)}
                </p>
              ) : null}
            </section>

            {data.durabilityNote ? (
              <section className="rounded-2xl bg-background/90 px-4 py-4 shadow-sm ring-1 ring-foreground/8 backdrop-blur">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Catatan daya tahan
                </p>
                <p className="mt-2 text-sm text-foreground text-pretty">{data.durabilityNote}</p>
              </section>
            ) : null}

            <section className="rounded-2xl bg-background/90 px-4 py-4 shadow-sm ring-1 ring-foreground/8 backdrop-blur">
              <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Jejak pengiriman
              </p>
              <TimelineStep
                icon={Package}
                label="Selesai dibuat"
                time={madeAt}
                done={isReady && (isInDelivery || isReceived)}
                active={isReady && !isInDelivery && !isReceived}
              />
              <TimelineStep
                icon={Truck}
                label="Dikirim ke sekolah"
                time={sentAt}
                done={Boolean(sentAt) && (isInDelivery || isReceived)}
                active={isInDelivery && !isReceived}
              />
              <TimelineStep
                icon={isReceived ? CheckCircle2 : Circle}
                label="Diterima sekolah"
                time={receivedAt}
                done={isReceived}
                active={false}
                isLast
              />
            </section>

            <section className="rounded-2xl bg-background/90 px-4 py-2 shadow-sm ring-1 ring-foreground/8 backdrop-blur">
              <InfoRow label="Sekolah" value={data.schoolName} />
              <InfoRow label="Alamat" value={data.schoolAddress} />
              <InfoRow label="SPPG" value={data.sppgName} />
              <InfoRow label="Produksi" value={data.productionCode} />
            </section>

            <footer className="space-y-1 px-1 pt-1 text-center">
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" />
                <span className="text-pretty">{data.sppgAddress}</span>
              </p>
              <p className="text-[11px] text-muted-foreground/80">
                Halaman ini memperbarui status otomatis setiap 5 detik.
              </p>
            </footer>
          </div>
        ) : null}
      </main>
    </div>
  );
}
