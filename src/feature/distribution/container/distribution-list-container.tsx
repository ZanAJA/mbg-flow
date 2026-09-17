"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api";
import { PageHeader, QueryState, EmptyState } from "@/shared/components/page-header";
import { ActionLink } from "@/shared/components/action-link";
import { DeliveryBadge, SafetyBadge } from "@/shared/components/status-badges";
import { Card, CardContent } from "@/shared/components/ui/card";

type Delivery = {
  id: string;
  code: string;
  deliveryStatus: string;
  safetyStatus: string;
  etaMinutes: number | null;
  recommendOrder: number;
  allocation: {
    portionQty: number;
    school: { name: string; distanceKm: number };
    batch: { code: string; menu: { name: string } };
  };
};

export function DistributionListContainer() {
  const query = useQuery({
    queryKey: ["delivery-batches"],
    queryFn: () => apiFetch<Delivery[]>("/api/delivery-batches"),
    refetchInterval: 8_000,
  });
  const rows = query.data?.data ?? [];

  return (
    <div>
      <PageHeader title="Perencanaan distribusi" />
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()}>
        {rows.length === 0 ? (
          <EmptyState
            title="Belum ada pengiriman"
            description="Assign sekolah pada production batch agar Delivery Batch dan QR muncul di sini."
          />
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <Card key={row.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Urutan {row.recommendOrder}</p>
                    <p className="font-semibold">{row.allocation.school.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {row.code} · {row.allocation.portionQty} porsi · {row.allocation.school.distanceKm} km · ETA {row.etaMinutes ?? "—"} menit
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.allocation.batch.code} · {row.allocation.batch.menu.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <DeliveryBadge status={row.deliveryStatus} />
                    <SafetyBadge status={row.safetyStatus} />
                    <ActionLink href={`/distribution/${row.id}`}>Operasikan</ActionLink>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </QueryState>
    </div>
  );
}
