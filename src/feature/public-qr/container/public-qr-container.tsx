"use client";

import { useQuery } from "@tanstack/react-query";
import { MapPin, QrCode, ShieldAlert } from "lucide-react";
import { apiFetch } from "@/shared/lib/api";
import { Countdown } from "@/shared/components/countdown";
import { SafetyBadge } from "@/shared/components/status-badges";
import { formatDateTime } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import type { PublicQrPayload } from "@/feature/public-qr/types";

const SAFETY_COPY: Record<string, { title: string; body: string }> = {
  SAFE: {
    title: "Masih dalam batas aman",
    body: "Makanan boleh dikonsumsi. Perhatikan sisa waktu di bawah.",
  },
  WARNING: {
    title: "Mendekati batas aman",
    body: "Segera bagikan atau konsumsi. Waktu tersisa sudah tipis.",
  },
  PAST_LIMIT: {
    title: "Lewat batas aman konsumsi",
    body: "Jangan dibagikan. Laporkan ke petugas SPPG untuk tindak lanjut.",
  },
  PENDING: {
    title: "Batas aman belum dihitung",
    body: "Produksi belum selesai mencatat waktu siap. Status akan muncul otomatis.",
  },
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-foreground/8 py-3 last:border-b-0">
      <p className="shrink-0 text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="text-right text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function formatActivityTime(value: string | null | undefined, emptyLabel: string) {
  if (!value) return emptyLabel;
  return formatDateTime(value);
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

  return (
    <div className={cn("min-h-screen overflow-x-clip bg-gradient-to-b", tone)}>
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <QrCode className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">MBG SPPG</p>
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
          <div className="space-y-5">
            <section className="overflow-hidden rounded-2xl bg-[#0b1f3a] px-5 py-6 text-white shadow-sm">
              <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-white/65">
                Menu pengiriman
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-balance">{data.menuName}</h1>
              <p className="mt-2 text-sm text-white/80">
                {data.portionQty} porsi {data.portionType === "BESAR" ? "besar" : "kecil"} · {data.schoolName}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs text-white">
                  {data.deliveryStatus === "PLANNED"
                    ? "Direncanakan"
                    : data.deliveryStatus === "READY"
                      ? "Siap berangkat"
                      : data.deliveryStatus === "IN_DELIVERY"
                        ? "Dalam pengiriman"
                        : data.deliveryStatus === "RECEIVED"
                          ? "Diterima sekolah"
                          : data.deliveryStatus}
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
                <p className="mt-1 text-sm text-muted-foreground">
                  {SAFETY_COPY[safety]?.body ?? SAFETY_COPY.PENDING.body}
                </p>
              </div>
              <div className="flex justify-center py-1">
                <Countdown
                  safeUntil={data.safeUntil}
                  serverNow={serverNow}
                  received={data.deliveryStatus === "RECEIVED"}
                />
              </div>
              {data.safeUntil ? (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Batas aman: {formatDateTime(data.safeUntil)}
                </p>
              ) : null}
            </section>

            <section className="rounded-2xl bg-background/90 px-4 py-2 shadow-sm ring-1 ring-foreground/8 backdrop-blur">
              <p className="border-b border-foreground/8 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Waktu kegiatan
              </p>
              <InfoRow label="Dibuat" value={formatActivityTime(data.createdAt, "Belum tercatat")} />
              <InfoRow label="Dikirim" value={formatActivityTime(data.departedAt, "Belum dikirim")} />
              <InfoRow label="Diterima" value={formatActivityTime(data.receivedAt, "Belum diterima")} />
            </section>

            <section className="rounded-2xl bg-background/90 px-4 py-2 shadow-sm ring-1 ring-foreground/8 backdrop-blur">
              <InfoRow label="Sekolah" value={data.schoolName} />
              <InfoRow label="Alamat" value={data.schoolAddress} />
              <InfoRow label="SPPG" value={data.sppgName} />
            </section>

            <footer className="space-y-1 px-1 text-center">
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3.5" />
                {data.sppgAddress}
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
