"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { apiFetch } from "@/shared/lib/api";
import { PageHeader, QueryState } from "@/shared/components/page-header";
import { Countdown } from "@/shared/components/countdown";
import { ActionLink } from "@/shared/components/action-link";
import { DeliveryBadge, FefoBadge, ProductionBadge, SafetyBadge } from "@/shared/components/status-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { daysUntil } from "@/shared/lib/format";
import type { Role } from "@/shared/types/enums";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";

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
  const date = new Date();
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  return (
    <div>
      <PageHeader title="Dashboard Operasional Hari Ini" action={today.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} />
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()}>
        {data ? (
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
              {[besar, kecil].map((batch, index) => {
                if (!batch) {
                  return (
                    <Card key={`empty-${index}`} size="default">
                      <CardHeader className="pb-0">
                        <CardTitle className="text-sm font-semibold text-muted-foreground">
                          {index === 0 ? "Porsi Besar" : "Porsi Kecil"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">Belum ada batch hari ini.</p>
                      </CardContent>
                    </Card>
                  );
                }

                const href = canProduction ? `/production/${batch.id}` : `/batches/${batch.id}`;
                return (
                  <Link
                    key={batch.id}
                    href={href}
                    aria-label={canProduction ? `Produksi ${batch.code}` : `Batch ${batch.code}`}
                    className="block"
                  >
                    <Card size="default" className="transition-colors hover:bg-muted/40">
                      <CardHeader className="pb-0">
                        <CardTitle className="text-sm font-semibold text-muted-foreground">
                          {index === 0 ? "Porsi Besar" : "Porsi Kecil"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <ProductionBadge status={batch.productionStatus} />
                              <SafetyBadge status={batch.safetyStatus} />
                            </div>
                            <p className="font-semibold">{batch.menu.name}</p>
                            <p className="text-sm font-semibold text-muted-foreground">
                              Kode Batch: {batch.code}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Total Porsi: {batch.actualQty}/{batch.targetQty}
                            </p>
                            
                          </div>
                          <Countdown size="sm" safeUntil={batch.safeUntil} serverNow={query.data!.serverNow} />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Pengiriman per sekolah</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.deliveries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada pengiriman.</p>
                ) : (
                  data.deliveries.map((row) => {
                    const href = canDistribution ? `/distribution/${row.id}` : `/labels/${row.id}`;
                    return (
                      <Link
                        key={row.id}
                        href={href}
                        className="flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors hover:bg-muted/40"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{row.allocation.school.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.code} · {row.allocation.portionQty} porsi
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <DeliveryBadge status={row.deliveryStatus} />
                          <SafetyBadge status={row.safetyStatus} />
                        </div>
                        <span
                          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground"
                          aria-hidden
                        >
                          <ChevronRight className="size-4" />
                        </span>
                      </Link>
                    );
                  })
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
                                <ActionLink href={`/ingredients/${lot.ingredient.id}`} variant="text">
                                  {lot.ingredient.name}
                                </ActionLink>
                              </TableCell>
                              <TableCell>{lot.lotCode}</TableCell>
                              <TableCell>
                                <FefoBadge days={days} showDays />
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
                              <ActionLink href={`/distribution/${row.id}`} variant="text">
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
