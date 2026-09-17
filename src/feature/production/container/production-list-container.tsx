"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/shared/lib/api";
import { PageHeader, QueryState, EmptyState } from "@/shared/components/page-header";
import { ActionLink } from "@/shared/components/action-link";
import { ProductionBadge, SafetyBadge } from "@/shared/components/status-badges";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";

type Batch = {
  id: string;
  code: string;
  portionType: string;
  productionStatus: string;
  safetyStatus: string;
  targetQty: number;
  menu: { name: string };
};

export function ProductionListContainer() {
  const router = useRouter();
  const query = useQuery({
    queryKey: ["production-batches"],
    queryFn: () => apiFetch<Batch[]>("/api/production-batches"),
  });
  const rows = query.data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Production batch"
        action={<Button onClick={() => router.push("/ai-menu")}>Pilih menu</Button>}
      />
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()}>
        {rows.length === 0 ? (
          <EmptyState
            title="Belum ada production batch"
            description="Pilih menu dari rekomendasi, lalu buat porsi besar atau porsi kecil."
          />
        ) : (
          <div className="space-y-3">
            {rows.map((batch) => (
              <Card key={batch.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
                  <div>
                    <p className="font-semibold">{batch.code}</p>
                    <p className="text-sm text-muted-foreground">
                      {batch.menu.name} · {batch.portionType === "BESAR" ? "Porsi Besar" : "Porsi Kecil"} · {batch.targetQty} porsi
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ProductionBadge status={batch.productionStatus} />
                    <SafetyBadge status={batch.safetyStatus} />
                    <ActionLink href={`/production/${batch.id}`}>Lacak</ActionLink>
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
