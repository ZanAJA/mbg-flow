"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api";
import { PageHeader, QueryState } from "@/shared/components/page-header";
import { Countdown } from "@/shared/components/countdown";
import { DeliveryBadge, ProductionBadge, SafetyBadge } from "@/shared/components/status-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatDateTime } from "@/shared/lib/format";

type DashboardData = {
  productionBatches: Array<{
    id: string;
    code: string;
    portionType: string;
    status: string;
    productionStatus: string;
    safetyStatus: string;
    targetQty: number;
    actualQty: number;
    safeUntil: string | null;
    menu: { name: string };
    allocations: Array<{
      school: { name: string };
      portionQty: number;
      packedQty: number;
      deliveryBatch: { id: string; status: string; code: string } | null;
    }>;
  }>;
  deliveries: Array<{
    id: string;
    code: string;
    status: string;
    deliveryStatus: string;
    safetyStatus: string;
    allocation: { school: { name: string }; portionQty: number; batch: { code: string; safeUntil: string | null } };
  }>;
  expiryWarnings: Array<{
    id: string;
    lotCode: string;
    expiryDate: string;
    quantity: number;
    ingredient: { name: string };
  }>;
  deadlineWarnings: Array<{ id: string; code: string; allocation: { school: { name: string } } }>;
};

export function DashboardContainer() {
  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<DashboardData>("/api/dashboard"),
    refetchInterval: 10_000,
  });

  const data = query.data?.data;
  const besar = data?.productionBatches.find((b) => b.portionType === "BESAR");
  const kecil = data?.productionBatches.find((b) => b.portionType === "KECIL");

  return (
    <div>
      <PageHeader
        title="Dashboard operasional hari ini"
        description="Status production batch porsi besar/kecil, pengiriman per sekolah, dan peringatan bahan atau deadline. Countdown tidak berhenti setelah makanan diterima."
      />
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()}>
        {data ? (
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
              {[besar, kecil].map((batch, index) => (
                <Card key={batch?.id ?? index}>
                  <CardHeader>
                    <CardTitle>{index === 0 ? "Porsi Besar" : "Porsi Kecil"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {batch ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{batch.code}</p>
                          <ProductionBadge status={batch.productionStatus} />
                          <SafetyBadge status={batch.safetyStatus} />
                        </div>
                        <p className="text-sm">{batch.menu.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Target {batch.targetQty} porsi · aktual {batch.actualQty}
                        </p>
                        <Countdown safeUntil={batch.safeUntil} serverNow={query.data!.serverNow} />
                        <Link className="text-sm font-medium text-primary" href={`/production/${batch.id}`}>
                          Buka pelacakan produksi
                        </Link>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Belum ada production batch {index === 0 ? "porsi besar" : "porsi kecil"} hari ini.
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Pengiriman per sekolah</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.deliveries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada delivery batch. Assign sekolah dari halaman produksi.</p>
                ) : (
                  data.deliveries.map((row) => (
                    <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
                      <div>
                        <p className="font-medium">{row.allocation.school.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.code} · {row.allocation.portionQty} porsi · {row.allocation.batch.code}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <DeliveryBadge status={row.deliveryStatus} />
                        <SafetyBadge status={row.safetyStatus} />
                        <Link className="text-sm text-primary" href={`/distribution/${row.id}`}>
                          Detail
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Peringatan bahan (FEFO)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.expiryWarnings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Tidak ada lot yang kedaluwarsa dalam 3 hari.</p>
                  ) : (
                    data.expiryWarnings.map((lot) => (
                      <p key={lot.id} className="text-sm">
                        <span className="font-medium">{lot.ingredient.name}</span> · {lot.lotCode} ·
                        kedaluwarsa {formatDateTime(lot.expiryDate)}
                      </p>
                    ))
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Pengiriman mendekati deadline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.deadlineWarnings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Tidak ada pengiriman yang mendekati atau melewati batas aman.</p>
                  ) : (
                    data.deadlineWarnings.map((row) => (
                      <p key={row.id} className="text-sm">
                        {row.allocation.school.name} · {row.code}
                      </p>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </QueryState>
    </div>
  );
}
