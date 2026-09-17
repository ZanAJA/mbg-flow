"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { apiFetch } from "@/shared/lib/api";
import { menuCoverUrl } from "@/shared/lib/menu-cover";
import { PageHeader, EmptyState } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent } from "@/shared/components/ui/card";
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
      toast.success("Peringkat menu siap.");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div>
      <PageHeader title="Rekomendasi menu" />
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
        <EmptyState title="Belum ada rekomendasi" description="Isi bahan dan target porsi." />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {result.items.map((item, index) => (
            <Link key={item.menuId} href={`/menus/${item.menuId}`} className="group block">
              <Card className="overflow-hidden py-0 transition-shadow group-hover:shadow-md">
                <div className="relative aspect-[5/3] overflow-hidden bg-muted">
                  <img
                    src={menuCoverUrl(item.name)}
                    alt={item.name}
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2.5 pb-2 pt-8">
                    <p className="text-[10px] text-white/75">#{index + 1}</p>
                    <p className="line-clamp-2 text-xs font-semibold leading-snug text-white">{item.name}</p>
                  </div>
                  <div className="absolute top-2 right-2">
                    {item.score > 65 ? (
                      <Badge className="h-5 px-1.5 text-[10px]">{item.score}</Badge>
                    ) : (
                      <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                        {item.score}
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
