"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api";
import { PageHeader, QueryState, EmptyState } from "@/shared/components/page-header";
import { Card, CardContent } from "@/shared/components/ui/card";
import { formatDateTime } from "@/shared/lib/format";

type Log = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  reason: string | null;
  createdAt: string;
  actor: { name: string; role: string };
};

export function AuditContainer() {
  const query = useQuery({
    queryKey: ["audit"],
    queryFn: () => apiFetch<Log[]>("/api/audit"),
  });
  const rows = query.data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Koreksi supervisor dan peristiwa operasional tercatat dengan before/after. Riwayat tidak dihapus saat nilai dikoreksi."
      />
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()}>
        {rows.length === 0 ? (
          <EmptyState title="Belum ada jejak audit" description="Mulai produksi, alokasi, atau koreksi untuk mengisi log." />
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <Card key={row.id}>
                <CardContent className="pt-4 text-sm">
                  <p className="font-medium">{row.action}</p>
                  <p className="text-muted-foreground">
                    {row.actor.name} · {row.entityType} · {formatDateTime(row.createdAt)}
                  </p>
                  {row.reason ? <p className="mt-1">Alasan: {row.reason}</p> : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </QueryState>
    </div>
  );
}
