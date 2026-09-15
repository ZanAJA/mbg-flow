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
  if (status === "SAFE") return <Badge className="bg-emerald-600 text-white">{safetyLabel.SAFE}</Badge>;
  if (status === "WARNING") return <Badge className="bg-amber-500 text-white">{safetyLabel.WARNING}</Badge>;
  if (status === "PAST_LIMIT") return <Badge variant="destructive">{safetyLabel.PAST_LIMIT}</Badge>;
  return <Badge variant="secondary">{safetyLabel.PENDING}</Badge>;
}
