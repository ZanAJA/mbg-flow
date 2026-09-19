"use client";

import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { apiFetch } from "@/shared/lib/api";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";

const manualMenuSchema = z.object({
  name: z.string().trim().min(3, "Nama menu minimal 3 karakter").max(100),
  porsiDasar: z.number().int().positive("Porsi dasar harus lebih dari 0"),
  durabilityNote: z.string().trim().min(5, "Tambahkan catatan ketahanan makanan").max(300),
  ingredients: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Nama bahan wajib diisi"),
        qtyPer100: z.number().positive("Jumlah harus lebih dari 0"),
        unit: z.string().trim().min(1, "Satuan wajib diisi"),
      }),
    )
    .min(1),
  steps: z
    .array(z.object({ value: z.string().trim().min(3, "Langkah memasak terlalu singkat") }))
    .min(1),
});

type ManualMenuValues = z.infer<typeof manualMenuSchema>;

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

export function ManualMenuForm() {
  const router = useRouter();
  const form = useForm<ManualMenuValues>({
    resolver: zodResolver(manualMenuSchema),
    defaultValues: {
      name: "",
      porsiDasar: 100,
      durabilityNote: "",
      ingredients: [{ name: "", qtyPer100: 1, unit: "kg" }],
      steps: [{ value: "" }],
    },
  });
  const ingredients = useFieldArray({ control: form.control, name: "ingredients" });
  const steps = useFieldArray({ control: form.control, name: "steps" });
  const createMenu = useMutation({
    mutationFn: (values: ManualMenuValues) =>
      apiFetch<{ id: string }>("/api/menus", {
        method: "POST",
        body: JSON.stringify({
          name: values.name,
          durabilityNote: values.durabilityNote,
          recipe: {
            porsiDasar: values.porsiDasar,
            bahan: values.ingredients,
            langkah: values.steps.map((step) => step.value),
          },
        }),
      }),
    onSuccess: (payload) => {
      toast.success("Menu manual berhasil disimpan.");
      router.push(`/menus/${payload.data.id}`);
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buat menu sendiri</CardTitle>
        <p className="text-sm text-muted-foreground">
          Isi resep secara manual. Menu akan langsung tersedia untuk pembuatan batch produksi.
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={form.handleSubmit((values) => createMenu.mutate(values))}>
          <div className="grid gap-4 md:grid-cols-[1fr_180px]">
            <div className="space-y-1.5">
              <Label htmlFor="manual-menu-name">Nama menu</Label>
              <Input
                id="manual-menu-name"
                placeholder="Nasi, ayam kecap, dan tumis sayur"
                aria-invalid={Boolean(form.formState.errors.name)}
                {...form.register("name")}
              />
              <FieldError message={form.formState.errors.name?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manual-base-portions">Porsi dasar resep</Label>
              <Input
                id="manual-base-portions"
                type="number"
                min={1}
                aria-invalid={Boolean(form.formState.errors.porsiDasar)}
                {...form.register("porsiDasar", { valueAsNumber: true })}
              />
              <FieldError message={form.formState.errors.porsiDasar?.message} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="manual-durability-note">Catatan ketahanan makanan</Label>
            <Textarea
              id="manual-durability-note"
              placeholder="Contoh: lauk berkuah perlu diprioritaskan untuk pengiriman lebih awal."
              aria-invalid={Boolean(form.formState.errors.durabilityNote)}
              {...form.register("durabilityNote")}
            />
            <FieldError message={form.formState.errors.durabilityNote?.message} />
          </div>

          <section className="space-y-3" aria-labelledby="manual-ingredients-title">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 id="manual-ingredients-title" className="font-medium">Bahan resep</h3>
                <p className="text-xs text-muted-foreground">Jumlah mengikuti porsi dasar di atas.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => ingredients.append({ name: "", qtyPer100: 1, unit: "kg" })}
              >
                <Plus /> Tambah bahan
              </Button>
            </div>

            <div className="space-y-2">
              {ingredients.fields.map((field, index) => (
                <div key={field.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_140px_110px_auto] sm:items-start">
                  <div className="space-y-1">
                    <Label htmlFor={`ingredient-${index}-name`}>Nama bahan</Label>
                    <Input
                      id={`ingredient-${index}-name`}
                      placeholder="Beras"
                      aria-invalid={Boolean(form.formState.errors.ingredients?.[index]?.name)}
                      {...form.register(`ingredients.${index}.name`)}
                    />
                    <FieldError message={form.formState.errors.ingredients?.[index]?.name?.message} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`ingredient-${index}-quantity`}>Jumlah</Label>
                    <Input
                      id={`ingredient-${index}-quantity`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      aria-invalid={Boolean(form.formState.errors.ingredients?.[index]?.qtyPer100)}
                      {...form.register(`ingredients.${index}.qtyPer100`, { valueAsNumber: true })}
                    />
                    <FieldError message={form.formState.errors.ingredients?.[index]?.qtyPer100?.message} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`ingredient-${index}-unit`}>Satuan</Label>
                    <Input
                      id={`ingredient-${index}-unit`}
                      placeholder="kg"
                      aria-invalid={Boolean(form.formState.errors.ingredients?.[index]?.unit)}
                      {...form.register(`ingredients.${index}.unit`)}
                    />
                    <FieldError message={form.formState.errors.ingredients?.[index]?.unit?.message} />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-5 text-muted-foreground hover:text-destructive"
                    aria-label={`Hapus bahan ${index + 1}`}
                    title="Hapus bahan"
                    disabled={ingredients.fields.length === 1}
                    onClick={() => ingredients.remove(index)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3" aria-labelledby="manual-steps-title">
            <div className="flex items-center justify-between gap-3">
              <h3 id="manual-steps-title" className="font-medium">Langkah memasak</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => steps.append({ value: "" })}>
                <Plus /> Tambah langkah
              </Button>
            </div>

            <div className="space-y-2">
              {steps.fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2">
                  <span className="mt-2 flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Textarea
                      aria-label={`Langkah memasak ${index + 1}`}
                      placeholder="Tuliskan proses memasak pada tahap ini"
                      aria-invalid={Boolean(form.formState.errors.steps?.[index]?.value)}
                      {...form.register(`steps.${index}.value`)}
                    />
                    <FieldError message={form.formState.errors.steps?.[index]?.value?.message} />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Hapus langkah ${index + 1}`}
                    title="Hapus langkah"
                    disabled={steps.fields.length === 1}
                    onClick={() => steps.remove(index)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          </section>

          <div className="flex justify-end border-t pt-4">
            <Button type="submit" disabled={createMenu.isPending}>
              <Save /> {createMenu.isPending ? "Menyimpan..." : "Simpan menu"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
