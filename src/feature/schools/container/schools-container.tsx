"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { apiFetch } from "@/shared/lib/api";
import { mapsUrlFromCoords, parseMapsLocation } from "@/shared/lib/geo";
import { PageHeader, QueryState, EmptyState } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";

type School = {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  distanceKm: number;
};

type Sppg = {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
};

const mapsUrlField = z
  .string()
  .trim()
  .min(1, "Link Google Maps wajib")
  .refine((value) => Boolean(parseMapsLocation(value)), {
    message: "Link Maps tidak berisi koordinat. Buka lokasi → Bagikan → salin link penuh.",
  });

const schoolSchema = z.object({
  name: z.string().trim().min(2, "Nama terlalu pendek"),
  address: z.string().trim().min(4, "Alamat terlalu pendek"),
  mapsUrl: z
    .string()
    .optional()
    .refine((value) => !value?.trim() || Boolean(parseMapsLocation(value)), {
      message: "Link Maps tidak berisi koordinat.",
    }),
  distanceKm: z.string().optional(),
});

const sppgSchema = z.object({
  name: z.string().trim().min(2),
  address: z.string().trim().min(4),
  mapsUrl: mapsUrlField,
});

type SchoolForm = z.infer<typeof schoolSchema>;

function toSchoolPayload(values: SchoolForm) {
  const coords = values.mapsUrl?.trim() ? parseMapsLocation(values.mapsUrl) : null;
  return {
    name: values.name,
    address: values.address,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    distanceKm: values.distanceKm?.trim() ? Number(values.distanceKm) : undefined,
  };
}

export function SchoolsContainer() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<School | null>(null);
  const [open, setOpen] = useState(false);

  const schools = useQuery({
    queryKey: ["schools"],
    queryFn: () => apiFetch<School[]>("/api/schools"),
  });
  const sppg = useQuery({
    queryKey: ["sppg"],
    queryFn: () => apiFetch<Sppg>("/api/sppg"),
  });

  const form = useForm<SchoolForm>({
    resolver: zodResolver(schoolSchema),
    defaultValues: { name: "", address: "", mapsUrl: "", distanceKm: "" },
  });

  const sppgForm = useForm({
    resolver: zodResolver(sppgSchema),
    values: {
      name: sppg.data?.data?.name ?? "",
      address: sppg.data?.data?.address ?? "",
      mapsUrl:
        sppg.data?.data?.lat != null && sppg.data?.data?.lng != null
          ? mapsUrlFromCoords(sppg.data.data.lat, sppg.data.data.lng)
          : "",
    },
  });

  const saveSchool = useMutation({
    mutationFn: async (values: SchoolForm) => {
      const payload = toSchoolPayload(values);
      if (editing) {
        return apiFetch(`/api/schools/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }
      return apiFetch("/api/schools", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast.success(editing ? "Sekolah diperbarui" : "Sekolah ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["schools"] });
      setOpen(false);
      setEditing(null);
      form.reset();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteSchool = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/schools/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Sekolah dihapus");
      queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const saveSppg = useMutation({
    mutationFn: (values: z.infer<typeof sppgSchema>) => {
      const coords = parseMapsLocation(values.mapsUrl);
      if (!coords) throw new Error("Link Maps tidak valid.");
      return apiFetch("/api/sppg", {
        method: "PATCH",
        body: JSON.stringify({
          name: values.name,
          address: values.address,
          lat: coords.lat,
          lng: coords.lng,
        }),
      });
    },
    onSuccess: () => {
      toast.success("Lokasi SPPG disimpan. ETA alokasi memakai jarak haversine.");
      queryClient.invalidateQueries({ queryKey: ["sppg"] });
      queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const rows = schools.data?.data ?? [];

  function openCreate() {
    setEditing(null);
    form.reset({ name: "", address: "", mapsUrl: "", distanceKm: "" });
    setOpen(true);
  }

  function openEdit(school: School) {
    setEditing(school);
    form.reset({
      name: school.name,
      address: school.address,
      mapsUrl:
        school.lat != null && school.lng != null ? mapsUrlFromCoords(school.lat, school.lng) : "",
      distanceKm: String(school.distanceKm),
    });
    setOpen(true);
  }

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader title="Sekolah & lokasi" action={<Button onClick={openCreate}>Tambah sekolah</Button>} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lokasi SPPG (titik berangkat)</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={sppgForm.handleSubmit((values) => saveSppg.mutate(values))}
          >
            <div className="space-y-1 sm:col-span-2">
              <Label>Nama SPPG</Label>
              <Input {...sppgForm.register("name")} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Alamat</Label>
              <Input {...sppgForm.register("address")} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Link Google Maps</Label>
              <Input
                placeholder="https://www.google.com/maps/place/..."
                {...sppgForm.register("mapsUrl")}
              />
              {sppgForm.formState.errors.mapsUrl ? (
                <p className="text-xs text-destructive">{sppgForm.formState.errors.mapsUrl.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Pin lokasi di Maps → Bagikan → salin link penuh (bukan maps.app.goo.gl).
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saveSppg.isPending}>
                Simpan lokasi SPPG
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <QueryState isLoading={schools.isLoading} error={schools.error} onRetry={() => schools.refetch()}>
        {rows.length === 0 ? (
          <EmptyState
            title="Belum ada sekolah"
            description="Tambah sekolah penerima MBG beserta alamat dan link Google Maps."
            actionLabel="Tambah sekolah"
            onAction={openCreate}
          />
        ) : (
          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Alamat</TableHead>
                    <TableHead>Maps</TableHead>
                    <TableHead>Jarak</TableHead>
                    <TableHead className="w-36">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((school) => (
                    <TableRow key={school.id}>
                      <TableCell className="font-medium">{school.name}</TableCell>
                      <TableCell className="max-w-[18rem] wrap-break-word">{school.address}</TableCell>
                      <TableCell>
                        {school.lat != null && school.lng != null ? (
                          <a
                            href={mapsUrlFromCoords(school.lat, school.lng)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            Buka Maps
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{school.distanceKm} km</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button type="button" size="sm" variant="ghost" onClick={() => openEdit(school)}>
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => {
                              if (confirm(`Hapus ${school.name}?`)) deleteSchool.mutate(school.id);
                            }}
                          >
                            Hapus
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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
              <CardTitle>{editing ? "Edit sekolah" : "Tambah sekolah"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={form.handleSubmit((values) => saveSchool.mutate(values))}>
                <div className="space-y-1">
                  <Label>Nama</Label>
                  <Input {...form.register("name")} />
                </div>
                <div className="space-y-1">
                  <Label>Alamat</Label>
                  <Input {...form.register("address")} />
                </div>
                <div className="space-y-1">
                  <Label>Link Google Maps</Label>
                  <Input
                    placeholder="https://www.google.com/maps/place/..."
                    {...form.register("mapsUrl")}
                  />
                  {form.formState.errors.mapsUrl ? (
                    <p className="text-xs text-destructive">{form.formState.errors.mapsUrl.message}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Opsional. Pin lokasi → Bagikan → salin link penuh.
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Jarak manual (km, opsional)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Otomatis dari koordinat jika kosong"
                    {...form.register("distanceKm")}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      setEditing(null);
                    }}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={saveSchool.isPending}>
                    Simpan
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
