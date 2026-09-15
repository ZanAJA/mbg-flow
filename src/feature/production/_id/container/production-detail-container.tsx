"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/shared/lib/api";
import { PageHeader, QueryState } from "@/shared/components/page-header";
import { Countdown } from "@/shared/components/countdown";
import { DeliveryBadge, ProductionBadge, SafetyBadge } from "@/shared/components/status-badges";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatDateTime } from "@/shared/lib/format";
import { useQuery as useMe } from "@tanstack/react-query";
import type { SessionShape } from "@/shared/components/session-types";

type Component = {
  id: string;
  name: string;
  componentKey: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  safeUntil: string | null;
  affectsSafetyDeadline: boolean;
  safeWindowMinutes: number;
};

type Batch = {
  id: string;
  code: string;
  portionType: string;
  productionStatus: string;
  safetyStatus: string;
  targetQty: number;
  actualQty: number;
  readyAt: string | null;
  safeUntil: string | null;
  menu: { name: string };
  sppg: { name: string };
  components: Component[];
  allocations: Array<{
    id: string;
    portionQty: number;
    packedQty: number;
    readyAt: string | null;
    school: { id: string; name: string };
    deliveryBatch: { id: string; code: string; status: string; qrToken: string } | null;
  }>;
};

export function ProductionDetailContainer() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [schoolId, setSchoolId] = useState("");
  const [portionQty, setPortionQty] = useState(240);
  const [packed, setPacked] = useState<Record<string, number>>({});
  const [correction, setCorrection] = useState<{ id: string; finishedAt: string; reason: string } | null>(null);

  const me = useMe({ queryKey: ["me"], queryFn: () => apiFetch<SessionShape>("/api/auth/me") });
  const query = useQuery({
    queryKey: ["production-batch", params.id],
    queryFn: () => apiFetch<Batch>(`/api/production-batches/${params.id}`),
    refetchInterval: 5_000,
  });
  const schools = useQuery({
    queryKey: ["schools"],
    queryFn: () => apiFetch<Array<{ id: string; name: string }>>("/api/schools"),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["production-batch", params.id] });
    queryClient.invalidateQueries({ queryKey: ["production-batches"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["delivery-batches"] });
  };

  const start = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/production-components/${id}/start`, { method: "POST", body: "{}" }),
    onSuccess: invalidate,
    onError: (error) => toast.error(error.message),
  });
  const finish = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/production-components/${id}/finish`, { method: "POST", body: "{}" }),
    onSuccess: invalidate,
    onError: (error) => toast.error(error.message),
  });
  const allocate = useMutation({
    mutationFn: () =>
      apiFetch(`/api/production-batches/${params.id}/allocations`, {
        method: "POST",
        body: JSON.stringify({ schoolId, portionQty }),
      }),
    onSuccess: () => {
      toast.success("Alokasi sekolah membentuk Delivery Batch + QR unik.");
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const pack = useMutation({
    mutationFn: (input: { id: string; packedQty: number }) =>
      apiFetch(`/api/allocations/${input.id}/pack`, {
        method: "POST",
        body: JSON.stringify({ packedQty: input.packedQty }),
      }),
    onSuccess: () => {
      toast.success("Jika porsi sekolah lengkap, delivery batch menjadi READY meskipun PB belum selesai.");
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const correct = useMutation({
    mutationFn: () =>
      apiFetch(`/api/corrections/component`, {
        method: "POST",
        body: JSON.stringify({
          entityId: correction?.id,
          reason: correction?.reason,
          patch: { finishedAt: correction?.finishedAt },
        }),
      }),
    onSuccess: () => {
      toast.success("Koreksi supervisor tersimpan ke audit log.");
      setCorrection(null);
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const batch = query.data?.data;
  const isSupervisor = me.data?.data.role === "SUPERVISOR";

  return (
    <div>
      <PageHeader
        title={batch ? `${batch.code} · ${batch.menu.name}` : "Pelacakan produksi"}
        description="Semua komponen bisa Mulai secara independen. Selesai hanya aktif setelah komponen itu dimulai. Waktu dicatat server."
      />
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()}>
        {batch ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <ProductionBadge status={batch.productionStatus} />
              <SafetyBadge status={batch.safetyStatus} />
              <span className="text-sm text-muted-foreground">
                {batch.portionType === "BESAR" ? "Porsi Besar" : "Porsi Kecil"} · {batch.actualQty}/{batch.targetQty} porsi · {batch.sppg.name}
              </span>
            </div>
            <Countdown safeUntil={batch.safeUntil} serverNow={query.data!.serverNow} />

            <div className="grid gap-3">
              {batch.components.map((component) => (
                <Card key={component.id}>
                  <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{component.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {component.affectsSafetyDeadline
                          ? `Memengaruhi deadline · jendela ${component.safeWindowMinutes} menit`
                          : "Tidak memengaruhi batas aman konsumsi"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Mulai {formatDateTime(component.startedAt)} · Selesai {formatDateTime(component.finishedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={component.status !== "NOT_STARTED" || start.isPending}
                        onClick={() => start.mutate(component.id)}
                      >
                        Mulai
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={component.status !== "IN_PROGRESS" || finish.isPending}
                        onClick={() => finish.mutate(component.id)}
                      >
                        Selesai
                      </Button>
                      {isSupervisor ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setCorrection({
                              id: component.id,
                              finishedAt: new Date().toISOString().slice(0, 16),
                              reason: "",
                            })
                          }
                        >
                          Koreksi
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Assign sekolah</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[1fr_140px_auto]">
                  <select className="h-8 rounded-lg border px-2 text-sm" value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
                    <option value="">Pilih sekolah</option>
                    {(schools.data?.data ?? []).map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                  <Input type="number" value={portionQty} onChange={(e) => setPortionQty(Number(e.target.value))} />
                  <Button onClick={() => allocate.mutate()} disabled={!schoolId || allocate.isPending}>
                    Buat alokasi
                  </Button>
                </div>
                {batch.allocations.map((allocation) => (
                  <div key={allocation.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{allocation.school.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {allocation.deliveryBatch?.code} · {allocation.packedQty}/{allocation.portionQty} terkemas
                        </p>
                      </div>
                      {allocation.deliveryBatch ? (
                        <div className="flex items-center gap-2">
                          <DeliveryBadge status={allocation.deliveryBatch.status} />
                          <Link className="text-sm text-primary" href={`/labels/${allocation.deliveryBatch.id}`}>
                            Label QR
                          </Link>
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Input
                        type="number"
                        value={packed[allocation.id] ?? allocation.packedQty}
                        onChange={(e) => setPacked((prev) => ({ ...prev, [allocation.id]: Number(e.target.value) }))}
                      />
                      <Button
                        variant="outline"
                        onClick={() =>
                          pack.mutate({
                            id: allocation.id,
                            packedQty: packed[allocation.id] ?? allocation.portionQty,
                          })
                        }
                      >
                        Tandai porsi siap
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </QueryState>

      {correction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md bg-background">
            <CardHeader>
              <CardTitle>Koreksi supervisor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="datetime-local"
                value={correction.finishedAt}
                onChange={(e) => setCorrection({ ...correction, finishedAt: e.target.value })}
              />
              <Input
                placeholder="Alasan wajib"
                value={correction.reason}
                onChange={(e) => setCorrection({ ...correction, reason: e.target.value })}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCorrection(null)}>
                  Batal
                </Button>
                <Button onClick={() => correct.mutate()} disabled={correct.isPending}>
                  Simpan koreksi
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
