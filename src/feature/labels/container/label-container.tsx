"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api";
import { PageHeader, QueryState } from "@/shared/components/page-header";
import { SafetyBadge } from "@/shared/components/status-badges";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { formatDateTime } from "@/shared/lib/format";

type Label = {
  publicUrl: string;
  qrDataUrl: string;
  menuName: string;
  sppgName: string;
  sppgAddress: string;
  schoolName: string;
  portionQty: number;
  productionCode: string;
  deliveryCode: string;
  safeUntil: string | null;
  safetyStatus: string;
};

export function LabelContainer() {
  const params = useParams<{ deliveryBatchId: string }>();
  const query = useQuery({
    queryKey: ["label", params.deliveryBatchId],
    queryFn: () => apiFetch<Label>(`/api/labels/${params.deliveryBatchId}`),
  });
  const label = query.data?.data;

  return (
    <div>
      <PageHeader
        title="Label sekolah"
        description="Setiap sekolah mendapat QR berbeda. Token merujuk ke alokasi sekolah, bukan ke seluruh production batch."
        action={
          <Button variant="outline" onClick={() => window.print()}>
            Cetak
          </Button>
        }
      />
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()}>
        {label ? (
          <Card className="mx-auto max-w-md print:shadow-none">
            <CardContent className="space-y-3 pt-6 text-center">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary">MBG · Label Distribusi</p>
              <img src={label.qrDataUrl} alt={`QR ${label.deliveryCode}`} className="mx-auto size-48" />
              <p className="text-xl font-semibold">{label.menuName}</p>
              <p className="text-sm">{label.sppgName}</p>
              <p className="text-xs text-muted-foreground">{label.sppgAddress}</p>
              <div className="rounded-lg bg-muted px-3 py-2 text-sm">
                <p className="font-medium">{label.schoolName}</p>
                <p>{label.portionQty} porsi</p>
                <p>{label.productionCode} · {label.deliveryCode}</p>
                <p>Batas aman: {formatDateTime(label.safeUntil)}</p>
              </div>
              <SafetyBadge status={label.safetyStatus} />
              <p className="break-all text-xs text-muted-foreground">{label.publicUrl}</p>
            </CardContent>
          </Card>
        ) : null}
      </QueryState>
    </div>
  );
}
