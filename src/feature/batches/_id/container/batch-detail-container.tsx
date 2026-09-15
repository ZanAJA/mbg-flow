"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api";
import { PageHeader, QueryState } from "@/shared/components/page-header";
import { Countdown } from "@/shared/components/countdown";
import { DeliveryBadge, ProductionBadge, SafetyBadge } from "@/shared/components/status-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatDateTime } from "@/shared/lib/format";

type Batch = {
  id: string;
  code: string;
  productionStatus: string;
  safetyStatus: string;
  targetQty: number;
  actualQty: number;
  readyAt: string | null;
  safeUntil: string | null;
  menu: { name: string };
  sppg: { name: string; address: string };
  allocations: Array<{
    portionQty: number;
    packedQty: number;
    school: { name: string };
    deliveryBatch: { id: string; code: string; status: string } | null;
  }>;
};

export function BatchDetailContainer() {
  const params = useParams<{ id: string }>();
  const query = useQuery({
    queryKey: ["production-batch", params.id],
    queryFn: () => apiFetch<Batch>(`/api/production-batches/${params.id}`),
    refetchInterval: 5_000,
  });
  const batch = query.data?.data;

  return (
    <div>
      <PageHeader
        title={batch ? batch.code : "Detail batch"}
        description="Countdown tetap tampil setelah produksi selesai dan setelah sekolah menerima makanan."
      />
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()}>
        {batch ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <ProductionBadge status={batch.productionStatus} />
              <SafetyBadge status={batch.safetyStatus} />
            </div>
            <Card>
              <CardContent className="space-y-2 pt-4 text-sm">
                <p><span className="text-muted-foreground">Menu:</span> {batch.menu.name}</p>
                <p><span className="text-muted-foreground">Asal SPPG:</span> {batch.sppg.name} · {batch.sppg.address}</p>
                <p><span className="text-muted-foreground">Porsi:</span> {batch.actualQty}/{batch.targetQty}</p>
                <p><span className="text-muted-foreground">Ready at:</span> {formatDateTime(batch.readyAt)}</p>
                <p><span className="text-muted-foreground">Safe until:</span> {formatDateTime(batch.safeUntil)}</p>
              </CardContent>
            </Card>
            <Countdown safeUntil={batch.safeUntil} serverNow={query.data!.serverNow} />
            <Card>
              <CardHeader>
                <CardTitle>Alokasi sekolah / Delivery Batch</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {batch.allocations.map((allocation) => (
                  <div key={allocation.school.name} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
                    <div>
                      <p className="font-medium">{allocation.school.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {allocation.deliveryBatch?.code} · {allocation.packedQty}/{allocation.portionQty}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {allocation.deliveryBatch ? <DeliveryBadge status={allocation.deliveryBatch.status} /> : null}
                      {allocation.deliveryBatch ? (
                        <Link className="text-sm text-primary" href={`/distribution/${allocation.deliveryBatch.id}`}>
                          Distribusi
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </QueryState>
    </div>
  );
}
