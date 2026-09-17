"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api";
import { PageHeader, QueryState, EmptyState } from "@/shared/components/page-header";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { formatDateTime } from "@/shared/lib/format";
import { TIMEZONE } from "@/shared/types/enums";
import { cn } from "@/shared/lib/utils";

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

const FIELD_LABELS: Record<string, string> = {
  lotCode: "Kode lot",
  quantity: "Jumlah",
  expiryDate: "Kedaluwarsa",
  receivedAt: "Diterima",
  storageType: "Penyimpanan",
  supplier: "Pemasok",
  status: "Status",
  code: "Kode",
  targetQty: "Target porsi",
  actualQty: "Porsi aktual",
  portionQty: "Jumlah porsi",
  portionType: "Tipe porsi",
  menuId: "Menu",
  schoolId: "Sekolah",
  startedAt: "Mulai",
  finishedAt: "Selesai",
  safeUntil: "Batas aman",
  name: "Nama",
  role: "Peran",
  deliveryStatus: "Status kirim",
  safetyStatus: "Status aman",
  productionStatus: "Status produksi",
  engine: "Mesin rekomendasi",
  top: "Menu teratas",
  targetPortions: "Target porsi",
  category: "Kategori",
  unit: "Satuan",
  componentKey: "Komponen",
};

const SKIP_FIELDS = new Set([
  "id",
  "ingredientId",
  "productionBatchId",
  "actorUserId",
  "createdAt",
  "updatedAt",
  "ingredient",
  "menu",
  "sppg",
  "allocations",
  "components",
  "actor",
  "school",
  "deliveryBatch",
  "qrToken",
]);

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

function formatValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return formatDateTime(date);
    }
    return value;
  }
  if (Array.isArray(value)) return `${value.length} item`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.name === "string") return record.name;
    if (typeof record.code === "string") return record.code;
    if (typeof record.lotCode === "string") return record.lotCode;
    return JSON.stringify(value);
  }
  return String(value);
}

function fieldLabel(key: string) {
  return FIELD_LABELS[key] ?? key;
}

function collectDiffs(before: Record<string, unknown> | null, after: Record<string, unknown> | null) {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const diffs: Array<{ key: string; before: string; after: string }> = [];

  for (const key of keys) {
    if (SKIP_FIELDS.has(key)) continue;
    const prevText = formatValue(before?.[key]);
    const nextText = formatValue(after?.[key]);
    if (before && after && prevText === nextText) continue;
    diffs.push({ key, before: prevText, after: nextText });
  }

  return diffs;
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

function AuditLogRow({ row }: { row: Log }) {
  const [open, setOpen] = useState(false);
  const before = parseJson(row.beforeJson);
  const after = parseJson(row.afterJson);
  const diffs = collectDiffs(before, after);
  const actionLabel = ACTION_LABELS[row.action] ?? row.action;
  const entityLabel = ENTITY_LABELS[row.entityType] ?? row.entityType;
  const hasDetails = Boolean(row.reason) || diffs.length > 0;

  return (
    <Card>
      <CardContent className="pt-4">
        <button
          type="button"
          className="flex w-full items-start justify-between gap-3 text-left"
          onClick={() => hasDetails && setOpen((value) => !value)}
          disabled={!hasDetails}
          aria-expanded={open}
        >
          <div className="min-w-0 space-y-1">
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
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <p className="hidden font-mono text-xs text-muted-foreground sm:block">
              {entityLabel} · {row.entityId.slice(0, 8)}
            </p>
            {hasDetails ? (
              <span
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-md border text-sm transition-transform",
                  open && "rotate-90",
                )}
                aria-hidden
              >
                →
              </span>
            ) : null}
          </div>
        </button>

        {open && hasDetails ? (
          <div className="mt-3 space-y-3 border-t pt-3">
            {row.reason ? (
              <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
                <span className="font-medium">Alasan: </span>
                {row.reason}
              </p>
            ) : null}

            {diffs.length > 0 ? (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[28%]">Field</TableHead>
                      <TableHead className="w-[36%]">Sebelum</TableHead>
                      <TableHead className="w-[36%]">Sesudah</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {diffs.map((diff) => (
                      <TableRow key={`${row.id}-${diff.key}`}>
                        <TableCell className="align-top font-medium">{fieldLabel(diff.key)}</TableCell>
                        <TableCell className="align-top text-muted-foreground">
                          {before ? diff.before : "—"}
                        </TableCell>
                        <TableCell className="align-top">{after ? diff.after : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button type="button" variant="ghost" size="xs" onClick={() => setOpen(false)}>
                Tutup
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
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
    <div>
      <PageHeader title="Audit log" />
      <Card className="mb-4">
        <CardContent className="grid gap-3 pt-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-1">
            <Label htmlFor="audit-from">Dari tanggal</Label>
            <Input id="audit-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="audit-to">Sampai tanggal</Label>
            <Input id="audit-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="audit-action">Kegiatan</Label>
            <select
              id="audit-action"
              className="h-8 w-full rounded-lg border px-2 text-sm"
              value={action}
              onChange={(e) => setAction(e.target.value)}
            >
              <option value="">Semua kegiatan</option>
              {actionOptions.map((key) => (
                <option key={key} value={key}>
                  {ACTION_LABELS[key] ?? key}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="audit-entity">Entitas</Label>
            <select
              id="audit-entity"
              className="h-8 w-full rounded-lg border px-2 text-sm"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
            >
              <option value="">Semua entitas</option>
              {entityOptions.map((key) => (
                <option key={key} value={key}>
                  {ENTITY_LABELS[key] ?? key}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="audit-actor">Pelaku</Label>
            <Input
              id="audit-actor"
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
