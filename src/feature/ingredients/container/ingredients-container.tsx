"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { apiFetch } from "@/shared/lib/api";
import { PageHeader, QueryState, EmptyState } from "@/shared/components/page-header";
import { ActionLink } from "@/shared/components/action-link";
import { Button } from "@/shared/components/ui/button";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { FefoBadge } from "@/shared/components/status-badges";
import { daysUntil, formatDate } from "@/shared/lib/format";

type Lot = {
  id: string;
  lotCode: string;
  quantity: number;
  expiryDate: string;
  receivedAt: string;
  storageType: string;
  supplier: string;
  status: string;
  ingredient: { id: string; name: string; category: string; unit: string };
};

type Ingredient = {
  id: string;
  name: string;
  category: string;
  unit: string;
  lots?: unknown[];
};

const lotSchema = z.object({
  name: z.string().trim().min(2, "Nama bahan wajib diisi"),
  category: z.string().trim().min(2, "Kategori wajib"),
  unit: z.string().trim().min(1, "Satuan wajib"),
  quantity: z.coerce.number().positive(),
  expiryDate: z.string().min(4),
  storageType: z.string().min(2),
  supplier: z.string().min(2),
});

const ingredientSchema = z.object({
  name: z.string().trim().min(2),
  category: z.string().trim().min(2),
  unit: z.string().trim().min(1),
});

type FefoFilter = "all" | "urgent" | "soon" | "ok";

const filterFieldClass = "min-w-0 space-y-1";
const selectTriggerClass = "w-full min-w-0 overflow-hidden [&>span]:min-w-0 [&>span]:truncate";

export function IngredientsContainer() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [storage, setStorage] = useState("");
  const [fefo, setFefo] = useState<FefoFilter>("all");
  const queryClient = useQueryClient();

  const lots = useQuery({
    queryKey: ["lots"],
    queryFn: () => apiFetch<Lot[]>("/api/ingredients/lots"),
  });
  const ingredients = useQuery({
    queryKey: ["ingredients"],
    queryFn: () => apiFetch<Ingredient[]>("/api/ingredients"),
  });

  const form = useForm({
    resolver: zodResolver(lotSchema),
    defaultValues: {
      name: "",
      category: "Umum",
      unit: "kg",
      quantity: 0,
      expiryDate: "",
      storageType: "Chiller 0-4°C",
      supplier: "",
    },
  });

  const ingredientForm = useForm({
    resolver: zodResolver(ingredientSchema),
    defaultValues: { name: "", category: "Umum", unit: "kg" },
  });

  const createLot = useMutation({
    mutationFn: (values: z.infer<typeof lotSchema>) =>
      apiFetch("/api/ingredients/lots", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      toast.success("Lot diterima.");
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
      setOpen(false);
      form.reset({
        name: "",
        category: "Umum",
        unit: "kg",
        quantity: 0,
        expiryDate: "",
        storageType: "Chiller 0-4°C",
        supplier: "",
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const saveIngredient = useMutation({
    mutationFn: async (values: z.infer<typeof ingredientSchema>) => {
      if (editingIngredient) {
        return apiFetch(`/api/ingredients/${editingIngredient.id}`, {
          method: "PATCH",
          body: JSON.stringify(values),
        });
      }
      return apiFetch("/api/ingredients", { method: "POST", body: JSON.stringify(values) });
    },
    onSuccess: () => {
      toast.success(editingIngredient ? "Bahan diperbarui" : "Bahan ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      setManageOpen(false);
      setEditingIngredient(null);
      ingredientForm.reset({ name: "", category: "Umum", unit: "kg" });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteIngredient = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/ingredients/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Bahan dihapus");
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const rows = lots.data?.data ?? [];
  const ingredientRows = ingredients.data?.data ?? [];

  const categoryOptions = useMemo(() => {
    return Array.from(new Set(rows.map((lot) => lot.ingredient.category))).sort();
  }, [rows]);

  const storageOptions = useMemo(() => {
    return Array.from(new Set(rows.map((lot) => lot.storageType))).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((lot) => {
      const days = daysUntil(lot.expiryDate);
      if (category && lot.ingredient.category !== category) return false;
      if (storage && lot.storageType !== storage) return false;
      if (fefo === "urgent" && days > 2) return false;
      if (fefo === "soon" && (days <= 2 || days > 5)) return false;
      if (fefo === "ok" && days <= 5) return false;
      if (needle) {
        const haystack = `${lot.ingredient.name} ${lot.lotCode} ${lot.supplier}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, search, category, storage, fefo]);

  const hasFilters = Boolean(search.trim() || category || storage || fefo !== "all");

  function resetFilters() {
    setSearch("");
    setCategory("");
    setStorage("");
    setFefo("all");
  }

  function openCreateIngredient() {
    setEditingIngredient(null);
    ingredientForm.reset({ name: "", category: "Umum", unit: "kg" });
    setManageOpen(true);
  }

  function openEditIngredient(item: Ingredient) {
    setEditingIngredient(item);
    ingredientForm.reset({
      name: item.name,
      category: item.category,
      unit: item.unit,
    });
    setManageOpen(true);
  }

  return (
    <div className="min-w-0">
      <PageHeader
        title="Bahan baku & lot"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={openCreateIngredient}>
              Kelola bahan
            </Button>
            <Button onClick={() => setOpen(true)}>Catat lot baru</Button>
          </div>
        }
      />

      {rows.length > 0 ? (
        <Card className="mb-4">
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className={filterFieldClass}>
              <Label htmlFor="lot-search">Cari</Label>
              <Input
                id="lot-search"
                className="min-w-0"
                placeholder="Nama bahan, kode lot, pemasok"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className={filterFieldClass}>
              <Label>Kategori</Label>
              <Select
                value={category || "__all__"}
                onValueChange={(value) => setCategory(value === "__all__" ? "" : value)}
              >
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue placeholder="Semua kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Semua kategori</SelectItem>
                  {categoryOptions.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={filterFieldClass}>
              <Label>Penyimpanan</Label>
              <Select
                value={storage || "__all__"}
                onValueChange={(value) => setStorage(value === "__all__" ? "" : value)}
              >
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue placeholder="Semua penyimpanan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Semua penyimpanan</SelectItem>
                  {storageOptions.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={filterFieldClass}>
              <Label>Status FEFO</Label>
              <Select value={fefo} onValueChange={(value) => setFefo(value as FefoFilter)}>
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue placeholder="Semua status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua status</SelectItem>
                  <SelectItem value="urgent">Segera pakai (max 2 hari)</SelectItem>
                  <SelectItem value="soon">Mendekati (3-5 hari)</SelectItem>
                  <SelectItem value="ok">Aman (lebih dari 5 hari)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {rows.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <p>
            Menampilkan {filtered.length} dari {rows.length} lot
          </p>
          {hasFilters ? (
            <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
              Reset filter
            </Button>
          ) : null}
        </div>
      ) : null}

      <QueryState isLoading={lots.isLoading} error={lots.error} onRetry={() => lots.refetch()}>
        {rows.length === 0 ? (
          <EmptyState
            title="Belum ada lot"
            description="Catat penerimaan bahan pertama — ketik nama bahan langsung."
            actionLabel="Catat lot"
            onAction={() => setOpen(true)}
          />
        ) : filtered.length === 0 ? (
          <EmptyState title="Tidak ada hasil" description="Ubah pencarian, kategori, penyimpanan, atau status FEFO." />
        ) : (
          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bahan</TableHead>
                    <TableHead>Kode lot</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Penyimpanan</TableHead>
                    <TableHead>FEFO</TableHead>
                    <TableHead className="w-10">
                      <span className="sr-only">Buka</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((lot) => {
                    const days = daysUntil(lot.expiryDate);
                    const href = `/ingredients/${lot.ingredient.id}`;
                    const isTopFefo = rows[0]?.id === lot.id;
                    return (
                      <TableRow
                        key={lot.id}
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer"
                        onClick={() => router.push(href)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            router.push(href);
                          }
                        }}
                      >
                        <TableCell>
                          <p className="font-medium">{lot.ingredient.name}</p>
                          <p className="text-xs text-muted-foreground">{lot.ingredient.category}</p>
                        </TableCell>
                        <TableCell>{lot.lotCode}</TableCell>
                        <TableCell>
                          {lot.quantity} {lot.ingredient.unit}
                        </TableCell>
                        <TableCell>{formatDate(lot.expiryDate)}</TableCell>
                        <TableCell>{lot.storageType}</TableCell>
                        <TableCell>
                          <FefoBadge days={days} isTop={isTopFefo} />
                        </TableCell>
                        <TableCell
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <ActionLink href={href} label={`Detail ${lot.ingredient.name}`} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </QueryState>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg bg-background">
            <CardHeader>
              <CardTitle>Penerimaan lot</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={form.handleSubmit((values) => createLot.mutate(values))}>
                <div className="space-y-1">
                  <Label>Nama bahan</Label>
                  <Input placeholder="Contoh: Dada ayam" list="ingredient-names" {...form.register("name")} />
                  <datalist id="ingredient-names">
                    {ingredientRows.map((item) => (
                      <option key={item.id} value={item.name} />
                    ))}
                  </datalist>
                  {form.formState.errors.name ? (
                    <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Kategori</Label>
                    <Input placeholder="Protein / Sayur" {...form.register("category")} />
                  </div>
                  <div className="space-y-1">
                    <Label>Satuan</Label>
                    <Input placeholder="kg / butir / L" {...form.register("unit")} />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Jumlah</Label>
                    <Input type="number" step="0.1" {...form.register("quantity")} />
                  </div>
                  <div className="space-y-1">
                    <Label>Tanggal kedaluwarsa</Label>
                    <Controller
                      control={form.control}
                      name="expiryDate"
                      render={({ field }) => (
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Tanggal kedaluwarsa"
                        />
                      )}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Penyimpanan</Label>
                    <Input {...form.register("storageType")} />
                  </div>
                  <div className="space-y-1">
                    <Label>Pemasok</Label>
                    <Input {...form.register("supplier")} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Nama bahan diketik bebas. Jika belum ada di master, otomatis dibuat.
                </p>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={createLot.isPending}>
                    Simpan lot
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {manageOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md bg-background">
            <CardHeader>
              <CardTitle>{editingIngredient ? "Edit bahan" : "Tambah bahan"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={ingredientForm.handleSubmit((values) => saveIngredient.mutate(values))}
              >
                <div className="space-y-1">
                  <Label>Nama</Label>
                  <Input {...ingredientForm.register("name")} />
                </div>
                <div className="space-y-1">
                  <Label>Kategori</Label>
                  <Input {...ingredientForm.register("category")} />
                </div>
                <div className="space-y-1">
                  <Label>Satuan</Label>
                  <Input {...ingredientForm.register("unit")} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setManageOpen(false);
                      setEditingIngredient(null);
                    }}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={saveIngredient.isPending}>
                    Simpan
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daftar bahan</CardTitle>
        </CardHeader>
        <CardContent>
          {ingredientRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada master bahan. Tambah lewat lot atau tombol Kelola bahan.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead className="w-40">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ingredientRows.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button type="button" size="sm" variant="ghost" onClick={() => openEditIngredient(item)}>
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm(`Hapus bahan ${item.name}?`)) deleteIngredient.mutate(item.id);
                          }}
                        >
                          Hapus
                        </Button>
                        <ActionLink href={`/ingredients/${item.id}`} label={`Lot ${item.name}`} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
