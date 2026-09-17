"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api";
import { PageHeader, QueryState } from "@/shared/components/page-header";
import { Countdown } from "@/shared/components/countdown";
import { ActionLink } from "@/shared/components/action-link";
import { DeliveryBadge, ProductionBadge, SafetyBadge } from "@/shared/components/status-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { daysUntil } from "@/shared/lib/format";
import type { Role } from "@/shared/types/enums";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";

type DashboardData = {
  role: Role;
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
    ingredient: { id: string; name: string };
  }>;
  deadlineWarnings: Array<{ id: string; code: string; allocation: { school: { id: string; name: string } } }>;
};

export function DashboardContainer() {
  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<DashboardData>("/api/dashboard"),
    refetchInterval: 10_000,
  });

  const data = query.data?.data;
  const role = data?.role;
  const canProduction = role === "SUPERVISOR" || role === "KITCHEN";
  const canDistribution = role === "SUPERVISOR" || role === "DISTRIBUTOR";
  const besar = data?.productionBatches.find((b) => b.portionType === "BESAR");
  const kecil = data?.productionBatches.find((b) => b.portionType === "KECIL");

  return (
    <div>
      <PageHeader title="Dashboard Operasional Hari Ini" />
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()}>
        {data ? (
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
              {[besar, kecil].map((batch, index) => (
                <Card key={batch?.id ?? index}>
                  <CardHeader className="pb-2">
                    <CardTitle>{index === 0 ? "Porsi Besar" : "Porsi Kecil"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {batch ? (
                      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{batch.code}</p>
                            <ProductionBadge status={batch.productionStatus} />
                            <SafetyBadge status={batch.safetyStatus} />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {batch.menu.name} · {batch.actualQty}/{batch.targetQty}
                          </p>
                          {canProduction ? (
                            <ActionLink href={`/production/${batch.id}`}>Produksi</ActionLink>
                          ) : (
                            <ActionLink href={`/batches/${batch.id}`}>Batch</ActionLink>
                          )}
                        </div>
                        <Countdown size="sm" safeUntil={batch.safeUntil} serverNow={query.data!.serverNow} />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Belum ada batch hari ini.</p>
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
                  <p className="text-sm text-muted-foreground">Belum ada pengiriman.</p>
                ) : (
                  data.deliveries.map((row) => (
                    <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
                      <div>
                        <p className="font-medium">{row.allocation.school.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.code} · {row.allocation.portionQty} porsi
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <DeliveryBadge status={row.deliveryStatus} />
                        <SafetyBadge status={row.safetyStatus} />
                        {canDistribution ? (
                          <ActionLink href={`/distribution/${row.id}`}>Detail</ActionLink>
                        ) : (
                          <ActionLink href={`/labels/${row.id}`}>Label</ActionLink>
                        )}
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
                    <p className="text-sm text-muted-foreground">Tidak ada lot kritis.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Bahan</TableHead>
                          <TableHead>Kode lot</TableHead>
                          <TableHead>Sisa</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.expiryWarnings.map((lot) => {
                          const days = daysUntil(lot.expiryDate);
                          return (
                            <TableRow key={lot.id}>
                              <TableCell>
                                <ActionLink href={`/ingredients/${lot.ingredient.id}`} size="xs">
                                  {lot.ingredient.name}
                                </ActionLink>
                              </TableCell>
                              <TableCell>{lot.lotCode}</TableCell>
                              <TableCell>
                                {days <= 1 ? (
                                  <Badge variant="destructive">{days} hari</Badge>
                                ) : (
                                  <Badge variant="secondary">{days} hari</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Pengiriman mendekati deadline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.deadlineWarnings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Tidak ada yang mendekati batas.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sekolah</TableHead>
                          <TableHead>Kode</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.deadlineWarnings.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <ActionLink href={`/distribution/${row.id}`} size="xs">
                                {row.allocation.school.name}
                              </ActionLink>
                            </TableCell>
                            <TableCell>{row.code}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
