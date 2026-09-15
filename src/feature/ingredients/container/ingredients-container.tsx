"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { apiFetch } from "@/shared/lib/api";
import { PageHeader, QueryState, EmptyState } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
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

const lotSchema = z.object({
  ingredientId: z.string().min(1, "Pilih bahan"),
  lotCode: z.string().min(3),
  quantity: z.coerce.number().positive(),
  expiryDate: z.string().min(4),
  storageType: z.string().min(2),
  supplier: z.string().min(2),
});

export function IngredientsContainer() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const lots = useQuery({
    queryKey: ["lots"],
    queryFn: () => apiFetch<Lot[]>("/api/ingredients/lots"),
  });
  const ingredients = useQuery({
    queryKey: ["ingredients"],
    queryFn: () => apiFetch<Array<{ id: string; name: string }>>("/api/ingredients"),
  });
  const form = useForm({
    resolver: zodResolver(lotSchema),
    defaultValues: {
      ingredientId: "",
      lotCode: "",
      quantity: 0,
      expiryDate: "",
      storageType: "Chiller 0-4°C",
      supplier: "",
    },
  });

  const createLot = useMutation({
    mutationFn: (values: z.infer<typeof lotSchema>) =>
      apiFetch("/api/ingredients/lots", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      toast.success("Lot diterima. Waktu received_at diambil dari server.");
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
      setOpen(false);
      form.reset();
    },
    onError: (error) => toast.error(error.message),
  });

  const rows = lots.data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Bahan baku & lot"
        description="Daftar lot dengan expiry dan penyimpanan. Lot yang paling cepat kedaluwarsa ditampilkan lebih dulu (FEFO)."
        action={<Button onClick={() => setOpen(true)}>Catat lot baru</Button>}
      />
      <QueryState isLoading={lots.isLoading} error={lots.error} onRetry={() => lots.refetch()}>
        {rows.length === 0 ? (
          <EmptyState
            title="Belum ada lot"
            description="Catat penerimaan bahan pertama agar menu dan produksi bisa memakai stok nyata."
            actionLabel="Catat lot"
            onAction={() => setOpen(true)}
          />
        ) : (
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bahan</TableHead>
                    <TableHead>Kode lot</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Penyimpanan</TableHead>
                    <TableHead>FEFO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((lot, index) => {
                    const days = daysUntil(lot.expiryDate);
                    return (
                      <TableRow key={lot.id}>
                        <TableCell>
                          <Link className="font-medium text-primary" href={`/ingredients/${lot.ingredient.id}`}>
                            {lot.ingredient.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">{lot.ingredient.category}</p>
                        </TableCell>
                        <TableCell>{lot.lotCode}</TableCell>
                        <TableCell>
                          {lot.quantity} {lot.ingredient.unit}
                        </TableCell>
                        <TableCell>{formatDate(lot.expiryDate)}</TableCell>
                        <TableCell>{lot.storageType}</TableCell>
                        <TableCell>
                          {days <= 2 ? (
                            <Badge variant="destructive">Segera pakai</Badge>
                          ) : index === 0 ? (
                            <Badge>Prioritas FEFO</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">{days} hari</span>
                          )}
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
                  <Label>Bahan</Label>
                  <select className="h-8 w-full rounded-lg border px-2 text-sm" {...form.register("ingredientId")}>
                    <option value="">Pilih bahan</option>
                    {(ingredients.data?.data ?? []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Kode lot</Label>
                    <Input {...form.register("lotCode")} />
                  </div>
                  <div className="space-y-1">
                    <Label>Jumlah</Label>
                    <Input type="number" step="0.1" {...form.register("quantity")} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Tanggal kedaluwarsa</Label>
                  <Input type="date" {...form.register("expiryDate")} />
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
                <p className="text-xs text-muted-foreground">received_at diisi otomatis oleh server saat lot disimpan.</p>
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
    </div>
  );
}
