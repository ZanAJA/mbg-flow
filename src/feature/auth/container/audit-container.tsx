"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { apiFetch } from "@/shared/lib/api";
import { PageHeader, QueryState, EmptyState } from "@/shared/components/page-header";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { formatDateTime } from "@/shared/lib/format";
import { TIMEZONE } from "@/shared/types/enums";

type Log = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeJson: string | null;
  afterJson: string | null;
  reason: string | null;
  createdAt: string;
  actor: { name: string; role: string };
};

const ACTION_LABELS: Record<string, string> = {
  ingredient_lot_received: "Penerimaan lot bahan",
  ingredient_created: "Bahan baku ditambahkan",
  ai_menu_recommendation: "Rekomendasi menu dibuat",
  production_batch_created: "Production batch dibuat",
  component_started: "Komponen produksi dimulai",
  component_finished: "Komponen produksi selesai",
  allocation_created: "Alokasi sekolah dibuat",
  delivery_batch_ready: "Delivery batch siap kirim",
  delivery_batch_unready: "Delivery batch dibatalkan siap",
  delivery_started: "Pengiriman dimulai",
  delivery_received: "Pengiriman diterima sekolah",
  supervisor_correction: "Koreksi supervisor",
};

const ENTITY_LABELS: Record<string, string> = {
  IngredientLot: "Lot bahan",
  Ingredient: "Bahan baku",
  Menu: "Menu",
  MenuRecommendation: "Rekomendasi menu",
  ProductionBatch: "Production batch",
  ProductionComponent: "Komponen produksi",
  SchoolAllocation: "Alokasi sekolah",
  DeliveryBatch: "Delivery batch",
};

function parseJson(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { nilai: parsed };
  } catch {
    return null;
  }
}

function roleLabel(role: string) {
  if (role === "SUPERVISOR") return "Supervisor";
  if (role === "KITCHEN") return "Dapur";
  if (role === "DISTRIBUTOR") return "Distributor";
  return role;
}

function jakartaDayKey(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function auditHref(row: Log): string {
  const payload = parseJson(row.afterJson) ?? parseJson(row.beforeJson);

  switch (row.entityType) {
    case "Menu":
      return `/menus/${row.entityId}`;
    case "Ingredient":
      return `/ingredients/${row.entityId}`;
    case "IngredientLot": {
      const ingredientId =
        typeof payload?.ingredientId === "string"
          ? payload.ingredientId
          : typeof (payload?.ingredient as { id?: string } | undefined)?.id === "string"
            ? (payload?.ingredient as { id: string }).id
            : null;
      return ingredientId ? `/ingredients/${ingredientId}` : "/ingredients";
    }
    case "ProductionBatch":
      return `/production/${row.entityId}`;
    case "ProductionComponent": {
      const batchId = typeof payload?.productionBatchId === "string" ? payload.productionBatchId : null;
      return batchId ? `/production/${batchId}` : "/production";
    }
    case "SchoolAllocation": {
      const batchId = typeof payload?.productionBatchId === "string" ? payload.productionBatchId : null;
      return batchId ? `/batches/${batchId}` : "/batches";
    }
    case "DeliveryBatch":
      return `/distribution/${row.entityId}`;
    default:
      return "/audit";
  }
}

function AuditLogRow({ row }: { row: Log }) {
  const actionLabel = ACTION_LABELS[row.action] ?? row.action;
  const entityLabel = ENTITY_LABELS[row.entityType] ?? row.entityType;
  const href = auditHref(row);

  return (
    <Link href={href} className="block">
      <Card size="sm" className="transition-colors hover:bg-muted/40">
        <CardContent className="flex items-center gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{actionLabel}</p>
              {row.action === "supervisor_correction" ? (
                <Badge variant="destructive">Koreksi</Badge>
              ) : (
                <Badge variant="secondary">{entityLabel}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {row.actor.name} · {roleLabel(row.actor.role)} · {formatDateTime(row.createdAt)}
            </p>
            {row.reason ? (
              <p className="line-clamp-1 text-xs text-muted-foreground">Alasan: {row.reason}</p>
            ) : null}
          </div>
          <p className="hidden shrink-0 font-mono text-xs text-muted-foreground sm:block">
            {entityLabel} · {row.entityId.slice(0, 8)}
          </p>
          <span
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground"
            aria-hidden
          >
            <ChevronRight className="size-4" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

export function AuditContainer() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [actorQuery, setActorQuery] = useState("");

  const query = useQuery({
    queryKey: ["audit"],
    queryFn: () => apiFetch<Log[]>("/api/audit"),
  });
  const rows = query.data?.data ?? [];

  const actionOptions = useMemo(() => {
    const keys = new Set(rows.map((row) => row.action));
    return Array.from(keys).sort();
  }, [rows]);

  const entityOptions = useMemo(() => {
    const keys = new Set(rows.map((row) => row.entityType));
    return Array.from(keys).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const actorNeedle = actorQuery.trim().toLowerCase();
    return rows.filter((row) => {
      const day = jakartaDayKey(row.createdAt);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      if (action && row.action !== action) return false;
      if (entityType && row.entityType !== entityType) return false;
      if (actorNeedle && !row.actor.name.toLowerCase().includes(actorNeedle)) return false;
      return true;
    });
  }, [rows, dateFrom, dateTo, action, entityType, actorQuery]);

  const hasFilters = Boolean(dateFrom || dateTo || action || entityType || actorQuery.trim());

  function resetFilters() {
    setDateFrom("");
    setDateTo("");
    setAction("");
    setEntityType("");
    setActorQuery("");
  }

  return (
    <div className="min-w-0">
      <PageHeader title="Audit log" />
      <Card className="mb-4">
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="min-w-0 space-y-1">
            <Label htmlFor="audit-from">Dari tanggal</Label>
            <DatePicker id="audit-from" value={dateFrom} onChange={setDateFrom} placeholder="Dari tanggal" />
          </div>
          <div className="min-w-0 space-y-1">
            <Label htmlFor="audit-to">Sampai tanggal</Label>
            <DatePicker id="audit-to" value={dateTo} onChange={setDateTo} placeholder="Sampai tanggal" />
          </div>
          <div className="min-w-0 space-y-1">
            <Label>Kegiatan</Label>
            <Select value={action || "__all__"} onValueChange={(value) => setAction(value === "__all__" ? "" : value)}>
              <SelectTrigger className="w-full min-w-0 overflow-hidden [&>span]:min-w-0 [&>span]:truncate">
                <SelectValue placeholder="Semua kegiatan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Semua kegiatan</SelectItem>
                {actionOptions.map((key) => (
                  <SelectItem key={key} value={key}>
                    {ACTION_LABELS[key] ?? key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 space-y-1">
            <Label>Entitas</Label>
            <Select
              value={entityType || "__all__"}
              onValueChange={(value) => setEntityType(value === "__all__" ? "" : value)}
            >
              <SelectTrigger className="w-full min-w-0 overflow-hidden [&>span]:min-w-0 [&>span]:truncate">
                <SelectValue placeholder="Semua entitas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Semua entitas</SelectItem>
                {entityOptions.map((key) => (
                  <SelectItem key={key} value={key}>
                    {ENTITY_LABELS[key] ?? key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 space-y-1">
            <Label htmlFor="audit-actor">Pelaku</Label>
            <Input
              id="audit-actor"
              className="min-w-0"
              placeholder="Nama pengguna"
              value={actorQuery}
              onChange={(e) => setActorQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <p>
          Menampilkan {filtered.length} dari {rows.length} log
        </p>
        {hasFilters ? (
          <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
            Reset filter
          </Button>
        ) : null}
      </div>

      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()}>
        {rows.length === 0 ? (
          <EmptyState title="Belum ada jejak audit" description="Mulai produksi, alokasi, atau koreksi untuk mengisi log." />
        ) : filtered.length === 0 ? (
          <EmptyState title="Tidak ada hasil" description="Ubah filter tanggal, kegiatan, entitas, atau pelaku." />
        ) : (
          <div className="space-y-3">
            {filtered.map((row) => (
              <AuditLogRow key={row.id} row={row} />
            ))}
          </div>
        )}
      </QueryState>
    </div>
  );
}
