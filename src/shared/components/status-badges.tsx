import { Badge } from "@/shared/components/ui/badge";
import type { DeliveryStatus, ProductionStatus, SafetyStatus } from "@/shared/types/enums";

const productionLabel: Record<ProductionStatus, string> = {
  DRAFT: "Draf",
  IN_PRODUCTION: "Produksi",
  PARTIALLY_READY: "Siap parsial",
  PRODUCTION_COMPLETE: "Produksi selesai",
  CLOSED: "Ditutup",
};

const deliveryLabel: Record<DeliveryStatus, string> = {
  PLANNED: "Direncanakan",
  READY: "Siap berangkat",
  IN_DELIVERY: "Dalam pengiriman",
  RECEIVED: "Diterima sekolah",
};

const safetyLabel: Record<SafetyStatus, string> = {
  SAFE: "Aman",
  WARNING: "Peringatan",
  PAST_LIMIT: "Lewat batas",
  PENDING: "Belum dihitung",
};

export function ProductionBadge({ status }: { status: ProductionStatus | string }) {
  return <Badge variant="secondary">{productionLabel[status as ProductionStatus] ?? status}</Badge>;
}

export function DeliveryBadge({ status }: { status: DeliveryStatus | string }) {
  return <Badge variant="outline">{deliveryLabel[status as DeliveryStatus] ?? status}</Badge>;
}

export function SafetyBadge({ status }: { status: SafetyStatus | string }) {
  if (status === "SAFE") {
    return (
      <Badge className="border-transparent bg-emerald-600/15 text-emerald-700 hover:bg-emerald-600/15 dark:text-emerald-300">
        {safetyLabel.SAFE}
      </Badge>
    );
  }
  if (status === "WARNING") {
    return (
      <Badge className="border-transparent bg-amber-500/15 text-amber-800 hover:bg-amber-500/15 dark:text-amber-300">
        {safetyLabel.WARNING}
      </Badge>
    );
  }
  if (status === "PAST_LIMIT") return <Badge variant="destructive">{safetyLabel.PAST_LIMIT}</Badge>;
  return <Badge variant="secondary">{safetyLabel.PENDING}</Badge>;
}

/** FEFO remaining-days badge: merah ≤2, kuning 3–5, hijau >5. */
export function FefoBadge({
  days,
  isTop,
  showDays = false,
}: {
  days: number;
  isTop?: boolean;
  /** When true, show remaining days count (dashboard "Sisa"). */
  showDays?: boolean;
}) {
  if (days <= 2) {
    return <Badge variant="destructive">{showDays ? `${days} hari` : "Segera pakai"}</Badge>;
  }
  if (days <= 5) {
    return (
      <Badge className="border-transparent bg-amber-500/15 text-amber-800 hover:bg-amber-500/15 dark:text-amber-300">
        {showDays ? `${days} hari` : "Mendekati"}
      </Badge>
    );
  }
  if (isTop && !showDays) {
    return (
      <Badge className="border-transparent bg-emerald-600 text-white hover:bg-emerald-600">
        Prioritas FEFO
      </Badge>
    );
  }
  return (
    <Badge className="border-transparent bg-emerald-600/15 text-emerald-700 hover:bg-emerald-600/15 dark:text-emerald-300">
      {showDays ? `${days} hari` : "Aman"}
    </Badge>
  );
}
