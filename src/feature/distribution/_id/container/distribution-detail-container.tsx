"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/shared/lib/api";
import { PageHeader, QueryState } from "@/shared/components/page-header";
import { ActionLink } from "@/shared/components/action-link";
import { Countdown } from "@/shared/components/countdown";
import { DeliveryBadge } from "@/shared/components/status-badges";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { formatDateTime } from "@/shared/lib/format";

type Delivery = {
  id: string;
  code: string;
  deliveryStatus: string;
  safetyStatus: string;
  etaMinutes: number | null;
  departedAt: string | null;
  receivedAt: string | null;
  readyAt: string | null;
  status: string;
  allocation: {
    portionQty: number;
    school: { name: string; address: string; distanceKm: number };
    batch: {
      id: string;
      code: string;
      safeUntil: string | null;
      menu: { name: string };
      sppg: { name: string };
    };
  };
};

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 text-sm sm:grid-cols-[9rem_1fr]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 font-medium break-words">{value}</dd>
    </div>
  );
}

export function DistributionDetailContainer() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["delivery-batch", params.id],
    queryFn: () => apiFetch<Delivery>(`/api/delivery-batches/${params.id}`),
    refetchInterval: 5_000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["delivery-batch", params.id] });
    queryClient.invalidateQueries({ queryKey: ["delivery-batches"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const start = useMutation({
    mutationFn: () => apiFetch(`/api/delivery-batches/${params.id}/start`, { method: "POST", body: "{}" }),
    onSuccess: () => {
      toast.success("Pengiriman berangkat. Countdown aman tetap berjalan.");
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const receive = useMutation({
    mutationFn: () => apiFetch(`/api/delivery-batches/${params.id}/receive`, { method: "POST", body: "{}" }),
    onSuccess: () => {
      toast.success("Diterima sekolah. Status delivery RECEIVED, safety status tidak ikut berhenti.");
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const row = query.data?.data;

  return (
    <div className="min-w-0">
      <PageHeader
        title={row?.allocation.school.name ?? "Detail distribusi"}
        action={row ? <DeliveryBadge status={row.deliveryStatus} /> : undefined}
      />
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()}>
        {row ? (
          <div className="space-y-4">
            <Card>
              <CardContent>
                <dl className="space-y-2.5">
                  <MetaRow label="Kode kirim" value={`${row.code} · ${row.allocation.portionQty} porsi`} />
                  <MetaRow label="Alamat" value={row.allocation.school.address} />
                  <MetaRow
                    label="Jarak / ETA"
                    value={`${row.allocation.school.distanceKm} km · ${row.etaMinutes ?? "—"} menit`}
                  />
                  <MetaRow
                    label="Menu"
                    value={`${row.allocation.batch.menu.name} · ${row.allocation.batch.sppg.name}`}
                  />
                  <MetaRow label="Siap" value={formatDateTime(row.readyAt)} />
                  <MetaRow label="Berangkat" value={formatDateTime(row.departedAt)} />
                  <MetaRow label="Diterima" value={formatDateTime(row.receivedAt)} />
                </dl>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Countdown safeUntil={row.allocation.batch.safeUntil} serverNow={query.data!.serverNow} />
              <div className="flex flex-wrap items-center gap-2">
                <Button disabled={row.status !== "READY" || start.isPending} onClick={() => start.mutate()}>
                  Berangkatkan
                </Button>
                <Button
                  variant="outline"
                  disabled={row.status !== "IN_DELIVERY" || receive.isPending}
                  onClick={() => receive.mutate()}
                >
                  Tandai diterima
                </Button>
                <ActionLink href={`/labels/${row.id}`} variant="text">
                  Label QR
                </ActionLink>
                <ActionLink href={`/batches/${row.allocation.batch.id}`} variant="text">
                  Batch
                </ActionLink>
              </div>
            </div>
          </div>
        ) : null}
      </QueryState>
    </div>
  );
}
