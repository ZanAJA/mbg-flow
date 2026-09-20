"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import type { SessionShape } from "@/shared/components/session-types";
import { MapPin, Plus } from "lucide-react";

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
  productionLocationId: z.string().min(1, "Pilih lokasi produksi"),
  kitchenTeamId: z.string().optional(),
  driverTeamId: z.string().optional(),
});

const locationSchema = z.object({
  name: z.string().trim().min(2, "Nama lokasi terlalu pendek"),
  address: z.string().trim().min(4, "Alamat terlalu pendek"),
});

type ProductionContext = {
  locations: Array<{ id: string; name: string; address: string }>;
  teams: Array<{
    id: string;
    name: string;
    members: Array<{ user: { id: string; name: string; role: string } }>;
  }>;
};

export function MenuDetailContainer() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [locationOpen, setLocationOpen] = useState(false);
  const query = useQuery({
    queryKey: ["menu", params.id],
    queryFn: () => apiFetch<MenuDetail>(`/api/menus/${params.id}`),
  });
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<SessionShape>("/api/auth/me"),
  });
  const context = useQuery({
    queryKey: ["production-context"],
    queryFn: () => apiFetch<ProductionContext>("/api/production-context"),
  });
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      portionType: "BESAR" as const,
      targetQty: 800,
      productionLocationId: "",
      kitchenTeamId: "",
      driverTeamId: "",
    },
  });
  const locationForm = useForm({
    resolver: zodResolver(locationSchema),
    defaultValues: { name: "", address: "" },
  });
  const createLocation = useMutation({
    mutationFn: (values: z.infer<typeof locationSchema>) =>
      apiFetch<{ id: string }>("/api/production-locations", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: async (payload) => {
      await queryClient.invalidateQueries({ queryKey: ["production-context"] });
      form.setValue("productionLocationId", payload.data.id, { shouldValidate: true });
      locationForm.reset();
      setLocationOpen(false);
      toast.success("Lokasi produksi ditambahkan.");
    },
    onError: (error) => toast.error(error.message),
  });
  const create = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      apiFetch<{ id: string }>("/api/production-batches", {
        method: "POST",
        body: JSON.stringify({
          menuId: params.id,
          ...values,
          kitchenTeamId: values.kitchenTeamId || undefined,
          driverTeamId: values.driverTeamId || undefined,
        }),
      }),
    onSuccess: (payload) => {
      toast.success("Production batch dibuat.");
      router.push(`/production/${payload.data.id}`);
    },
    onError: (error) => toast.error(error.message),
  });
  const menu = query.data?.data;
  const productionContext = context.data?.data;
  const isSupervisor = me.data?.data.role === "SUPERVISOR";
  const kitchenTeams = productionContext?.teams.filter((team) =>
    team.members.some((member) => member.user.role === "KITCHEN"),
  ) ?? [];
  const driverTeams = productionContext?.teams.filter((team) =>
    team.members.some((member) => member.user.role === "DISTRIBUTOR"),
  ) ?? [];

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
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Lokasi produksi</Label>
                      {isSupervisor ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setLocationOpen(true)}
                        >
                          <Plus className="size-4" />
                          Tambah
                        </Button>
                      ) : null}
                    </div>
                    <Controller
                      control={form.control}
                      name="productionLocationId"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Pilih dapur produksi" />
                          </SelectTrigger>
                          <SelectContent>
                            {productionContext?.locations.map((location) => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.productionLocationId ? (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.productionLocationId.message}
                      </p>
                    ) : null}
                  </div>
                  {isSupervisor ? (
                    <>
                      <div className="space-y-1">
                        <Label>Tim dapur</Label>
                        <Controller
                          control={form.control}
                          name="kitchenTeamId"
                          render={({ field }) => (
                            <Select
                              value={field.value || "unassigned"}
                              onValueChange={(value) => field.onChange(value === "unassigned" ? "" : value)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Semua tim dapur</SelectItem>
                                {kitchenTeams.map((team) => (
                                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Tim pengemudi</Label>
                        <Controller
                          control={form.control}
                          name="driverTeamId"
                          render={({ field }) => (
                            <Select
                              value={field.value || "unassigned"}
                              onValueChange={(value) => field.onChange(value === "unassigned" ? "" : value)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Semua tim pengemudi</SelectItem>
                                {driverTeams.map((team) => (
                                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </>
                  ) : null}
                  <Button type="submit" className="w-full" disabled={create.isPending}>
                    Buat batch
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </QueryState>
      {locationOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md bg-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-5" />
                Tambah lokasi produksi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={locationForm.handleSubmit((values) => createLocation.mutate(values))}
              >
                <div className="space-y-1">
                  <Label htmlFor="location-name">Nama lokasi</Label>
                  <Input id="location-name" placeholder="Dapur Utama" {...locationForm.register("name")} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="location-address">Alamat</Label>
                  <Input id="location-address" placeholder="Alamat lengkap dapur" {...locationForm.register("address")} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setLocationOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={createLocation.isPending}>Simpan lokasi</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
