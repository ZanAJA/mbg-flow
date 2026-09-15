"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api";
import { PageHeader, QueryState, EmptyState } from "@/shared/components/page-header";
import { ProductionBadge, SafetyBadge } from "@/shared/components/status-badges";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";

type Batch = {
  id: string;
  code: string;
  productionStatus: string;
  safetyStatus: string;
  menu: { name: string };
  allocations: Array<{ deliveryBatch: { status: string } | null }>;
};

const FILTERS = [
  { id: "progress", label: "In Progress" },
  { id: "delivery", label: "Ready / Delivery" },
  { id: "completed", label: "Completed" },
] as const;

export function BatchesContainer() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("progress");
  const query = useQuery({
    queryKey: ["production-batches"],
    queryFn: () => apiFetch<Batch[]>("/api/production-batches"),
  });

  const rows = useMemo(() => {
    const all = query.data?.data ?? [];
    return all.filter((batch) => {
      const hasReady = batch.allocations.some(
        (a) => a.deliveryBatch && ["READY", "IN_DELIVERY", "RECEIVED"].includes(a.deliveryBatch.status),
      );
      if (filter === "progress") {
        return ["DRAFT", "IN_PRODUCTION", "PARTIALLY_READY"].includes(batch.productionStatus);
      }
      if (filter === "delivery") return hasReady && batch.productionStatus !== "CLOSED";
      return ["PRODUCTION_COMPLETE", "CLOSED"].includes(batch.productionStatus);
    });
  }, [filter, query.data]);

  return (
    <div>
      <PageHeader
        title="Daftar batch"
        description="Riwayat production batch harus bisa dibuka sebelum melihat countdown dan alokasi sekolah."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Button key={item.id} variant={filter === item.id ? "default" : "outline"} onClick={() => setFilter(item.id)}>
            {item.label}
          </Button>
        ))}
      </div>
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()}>
        {rows.length === 0 ? (
          <EmptyState title="Tidak ada batch pada filter ini" description="Ubah tab atau buat production batch baru dari menu." />
        ) : (
          <div className="space-y-3">
            {rows.map((batch) => (
              <Card key={batch.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
                  <div>
                    <p className="font-semibold">{batch.code}</p>
                    <p className="text-sm text-muted-foreground">{batch.menu.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ProductionBadge status={batch.productionStatus} />
                    <SafetyBadge status={batch.safetyStatus} />
                    <Link className="text-sm font-medium text-primary" href={`/batches/${batch.id}`}>
                      Detail & countdown
                    </Link>
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
