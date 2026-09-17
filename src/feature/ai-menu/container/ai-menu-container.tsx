"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { apiFetch } from "@/shared/lib/api";
import { PageHeader, EmptyState } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";

const schema = z.object({
  ingredientsText: z.string().min(3, "Isi bahan utama"),
  targetPortions: z.coerce.number().int().positive(),
});

type Recommendation = {
  engine: string;
  note: string;
  items: Array<{
    menuId: string;
    name: string;
    score: number;
    durabilityNote: string;
    rationale: string[];
    needs: Array<{ name: string; required: number; available: number; unit: string; shortage: number }>;
  }>;
};

export function AiMenuContainer() {
  const [result, setResult] = useState<Recommendation | null>(null);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { ingredientsText: "ayam, beras, wortel", targetPortions: 800 },
  });

  const generate = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      const mainIngredients = values.ingredientsText
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => ({ name, quantity: 0 }));
      return apiFetch<Recommendation>("/api/ai/menu-recommendations", {
        method: "POST",
        body: JSON.stringify({ mainIngredients, targetPortions: values.targetPortions }),
      });
    },
    onSuccess: (payload) => {
      setResult(payload.data);
      toast.success("Peringkat menu siap. Batas aman konsumsi tidak dihitung oleh AI.");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div>
      <PageHeader
        title="Rekomendasi menu"
        description="AI/katalog hanya merangking menu, resep, dan kebutuhan bahan. Angka safe window tetap dari ruleset tervalidasi, bukan dari model."
      />
      <Card className="mb-6">
        <CardContent className="pt-4">
          <form className="grid gap-4 md:grid-cols-[1fr_160px_auto]" onSubmit={form.handleSubmit((v) => generate.mutate(v))}>
            <div className="space-y-1">
              <Label>Bahan utama</Label>
              <Input placeholder="ayam, beras, wortel" {...form.register("ingredientsText")} />
            </div>
            <div className="space-y-1">
              <Label>Target porsi</Label>
              <Input type="number" {...form.register("targetPortions")} />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={generate.isPending}>
                {generate.isPending ? "Menghitung..." : "Buat peringkat"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {!result ? (
        <EmptyState
          title="Belum ada rekomendasi"
          description="Masukkan bahan utama dan target porsi, lalu sistem merangking menu dari katalog + stok lot."
        />
      ) : (
        <div className="space-y-4">
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">{result.note}</p>
          {result.items.map((item, index) => (
            <Card key={item.menuId}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Peringkat {index + 1}</p>
                  <CardTitle>{item.name}</CardTitle>
                </div>
                {
                  item.score > 65 ? (
                    <Badge>Skor {item.score}</Badge>
                  ) : (
                    <Badge variant="destructive">Skor {item.score}</Badge>
                  )
                }
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{item.durabilityNote}</p>
                {/* <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {item.rationale.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul> */}
                {/* <div className="text-sm">
                  {item.needs.map((need) => (
                    <p key={need.name}>
                      {need.name}: butuh {need.required} {need.unit}, stok {need.available}
                      {need.shortage > 0 ? ` (kurang ${need.shortage})` : ""}
                    </p>
                  ))}
                </div> */}
                <Link className="text-sm font-medium text-primary" href={`/menus/${item.menuId}`}>
                  Lihat resep & buat production batch
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
