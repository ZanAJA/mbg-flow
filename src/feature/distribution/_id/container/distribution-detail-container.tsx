"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/shared/lib/api";
import { PageHeader, QueryState } from "@/shared/components/page-header";
import { Countdown } from "@/shared/components/countdown";
import { DeliveryBadge, SafetyBadge } from "@/shared/components/status-badges";
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
    <div>
      <PageHeader
        title={row?.allocation.school.name ?? "Detail distribusi"}
        description="Delivery status, production status, dan safety status adalah tiga hal berbeda."
      />
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()}>
        {row ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <DeliveryBadge status={row.deliveryStatus} />
              <SafetyBadge status={row.safetyStatus} />
            </div>
            <Card>
              <CardContent className="space-y-2 pt-4 text-sm">
                <p>{row.code} · {row.allocation.portionQty} porsi</p>
                <p>{row.allocation.school.address}</p>
                <p>Jarak {row.allocation.school.distanceKm} km · ETA {row.etaMinutes ?? "—"} menit</p>
                <p>Menu {row.allocation.batch.menu.name} dari {row.allocation.batch.sppg.name}</p>
                <p>Siap {formatDateTime(row.readyAt)} · Berangkat {formatDateTime(row.departedAt)} · Diterima {formatDateTime(row.receivedAt)}</p>
              </CardContent>
            </Card>
            <Countdown safeUntil={row.allocation.batch.safeUntil} serverNow={query.data!.serverNow} />
            <div className="flex flex-wrap gap-2">
              <Button disabled={row.status !== "READY" || start.isPending} onClick={() => start.mutate()}>
                Berangkatkan
              </Button>
              <Button
                variant="outline"
                disabled={row.status !== "IN_DELIVERY" || receive.isPending}
                onClick={() => receive.mutate()}
              >
                Tandai diterima sekolah
              </Button>
              <Link className="text-sm font-medium text-primary" href={`/labels/${row.id}`}>
                Label QR
              </Link>
              <Link className="text-sm font-medium text-primary" href={`/batches/${row.allocation.batch.id}`}>
                Production batch
              </Link>
            </div>
          </div>
        ) : null}
      </QueryState>
    </div>
  );
}
