"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { apiFetch } from "@/shared/lib/api";
import { menuCoverUrl } from "@/shared/lib/menu-cover";
import { PageHeader, QueryState } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

type MenuDetail = {
  id: string;
  name: string;
  durabilityNote: string;
  recipe: { langkah: string[]; bahan: Array<{ name: string; qtyPer100: number; unit: string }> };
  components: Array<{ key: string; name: string }>;
};

const schema = z.object({
  portionType: z.enum(["BESAR", "KECIL"]),
  targetQty: z.coerce.number().int().positive(),
});

export function MenuDetailContainer() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const query = useQuery({
    queryKey: ["menu", params.id],
    queryFn: () => apiFetch<MenuDetail>(`/api/menus/${params.id}`),
  });
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { portionType: "BESAR" as const, targetQty: 800 },
  });
  const create = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      apiFetch<{ id: string }>("/api/production-batches", {
        method: "POST",
        body: JSON.stringify({ menuId: params.id, ...values }),
      }),
    onSuccess: (payload) => {
      toast.success("Production batch dibuat.");
      router.push(`/production/${payload.data.id}`);
    },
    onError: (error) => toast.error(error.message),
  });
  const menu = query.data?.data;

  return (
    <div>
      <PageHeader title={menu?.name ?? "Detail menu"} />
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()}>
        {menu ? (
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="overflow-hidden pt-0">
              <div className="aspect-2/1 max-h-56 bg-muted">
                <img
                  src={menuCoverUrl(menu.name)}
                  alt={menu.name}
                  className="size-full object-cover"
                />
              </div>
              <CardHeader>
                <CardTitle>Resep</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Bahan /100 porsi</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {menu.recipe.bahan.map((item) => (
                      <li key={item.name}>
                        {item.name}: {item.qtyPer100} {item.unit}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-medium">Langkah</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
                    {menu.recipe.langkah.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Buat batch</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={form.handleSubmit((v) => create.mutate(v))}>
                  <div className="space-y-1">
                    <Label>Tipe porsi</Label>
                    <Controller
                      control={form.control}
                      name="portionType"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Pilih tipe porsi" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BESAR">Porsi Besar</SelectItem>
                            <SelectItem value="KECIL">Porsi Kecil</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Target porsi</Label>
                    <Input type="number" {...form.register("targetQty")} />
                  </div>
                  <Button type="submit" className="w-full" disabled={create.isPending}>
                    Buat batch
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </QueryState>
    </div>
  );
}
