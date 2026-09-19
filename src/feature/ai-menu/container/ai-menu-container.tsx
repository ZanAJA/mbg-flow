"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PencilLine, Sparkles } from "lucide-react";
import { apiFetch } from "@/shared/lib/api";
import { menuCoverUrl } from "@/shared/lib/menu-cover";
import { ManualMenuForm } from "@/feature/ai-menu/components/manual-menu-form";
import { PageHeader, EmptyState } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

const STORAGE_KEY = "mbg-ai-menu-recommendations";
const schema = z.object({
  ingredientsText: z.string().min(3, "Isi bahan utama"),
  targetPortions: z.coerce.number().int().positive(),
});

type Recommendation = {
  generatedAt: string;
  targetPortions: number;
  engine: string;
  note: string;
  items: Array<{
    menuId: string;
    rank: number;
    name: string;
    durabilityCategory:
      | "LEBIH_TAHAN"
      | "SEDANG"
      | "LEBIH_CEPAT_RUSAK";
    durabilityRank: number;
    durabilityNote: string;
    recipe: {
      porsiDasar: number;
      bahan: Array<{
        name: string;
        qtyPer100: number;
        unit: string;
      }>;
      langkah: string[];
    };
    components: Array<{
      key: string;
      name: string;
    }>;
    needs: Array<{
      name: string;
      required: number;
      available: number;
      unit: string;
      shortage: number;
    }>;
    rationale: string[];
  }>;
};

function engineLabel(engine: string) {
  if (engine.includes("openai")) {
    return "OpenAI";
  }

  return "AI";
}

function durabilityLabel(rank: number) {
  if (rank >= 3) {
    return "Lebih tahan";
  }

  if (rank === 2) {
    return "Ketahanan sedang";
  }

  return "Lebih cepat rusak";
}

export function AiMenuContainer() {
  const [result, setResult] = useState<Recommendation | null>(null);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      ingredientsText: "ayam, beras, wortel",
      targetPortions: 800,
    },
  });

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);

      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as Recommendation;

      const hasValidMenuIds =
        Array.isArray(parsed?.items) &&
        parsed.items.length > 0 &&
        parsed.items.every(
          (item) =>
            typeof item.menuId === "string" &&
            item.menuId.length > 0,
        );

      if (hasValidMenuIds) {
        startTransition(() => setResult(parsed));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error(
        "Failed to restore AI menu recommendation.",
        error,
      );

      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const generate = useMutation({
    mutationFn: async (
      values: z.infer<typeof schema>,
    ) => {
      const mainIngredients = values.ingredientsText
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => ({
          name,
          quantity: 0,
        }));

      return apiFetch<Recommendation>(
        "/api/ai/menu-recommendations",
        {
          method: "POST",
          body: JSON.stringify({
            mainIngredients,
            targetPortions: values.targetPortions,
          }),
        },
      );
    },

    onSuccess: (payload) => {
      setResult(payload.data);
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(payload.data),
      );

      toast.success(
        "Menu dan resep berhasil dibuat oleh AI.",
      );
    },

    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <div>
      <PageHeader title="Rekomendasi menu" />
      <p className="mb-4 -mt-4 text-sm text-muted-foreground">
        Pilih rekomendasi AI atau masukkan resep menu sendiri untuk digunakan dalam produksi.
      </p>
      <Tabs defaultValue="ai" className="gap-5">
        <TabsList className="h-9">
          <TabsTrigger value="ai" className="px-3">
            <Sparkles /> Rekomendasi AI
          </TabsTrigger>
          <TabsTrigger value="manual" className="px-3">
            <PencilLine /> Input manual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardContent>
              <form
                className="grid gap-4 md:grid-cols-[1fr_160px_auto]"
                onSubmit={form.handleSubmit((values) => generate.mutate(values))}
              >
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
                    <Sparkles className="size-3.5" />
                    {generate.isPending ? "Generate menu..." : "Generate menu AI"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {!result ? (
            <EmptyState
              title="Belum ada menu"
              description="Isi bahan utama dan target porsi, lalu generate menu dengan AI."
            />
          ) : (
            <div className="space-y-4">
          <div className="flex flex-wrap items-start gap-2">
            <Badge
              variant="secondary"
              className="gap-1"
            >
              <Sparkles className="size-3" />
              {engineLabel(result.engine)}
            </Badge>

            <p className="max-w-3xl text-sm text-muted-foreground">
              {result.note}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {result.items.map((item) => (
              <Link
                key={item.menuId}
                href={`/menus/${item.menuId}`}
                className="group block"
              >
                <Card className="overflow-hidden py-0 transition-shadow group-hover:shadow-md">
                  <div className="relative aspect-5/3 overflow-hidden bg-muted">
                    <img
                      src={menuCoverUrl(item.name)}
                      alt={item.name}
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent px-2.5 pb-2 pt-8">
                      <p className="text-[10px] text-white/75">
                        #{item.rank}
                      </p>

                      <p className="line-clamp-2 text-xs font-semibold leading-snug text-white">
                        {item.name}
                      </p>

                      {item.rationale[0] ? (
                        <p className="mt-0.5 line-clamp-2 text-[10px] text-white/70">
                          {item.rationale[0]}
                        </p>
                      ) : null}
                    </div>

                    <div className="absolute top-2 right-2">
                      <Badge
                        variant={
                          item.durabilityRank >= 3
                            ? "default"
                            : item.durabilityRank === 2
                              ? "secondary"
                              : "destructive"
                        }
                        className="h-5 px-1.5 text-[10px]"
                      >
                        {durabilityLabel(
                          item.durabilityRank,
                        )}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium">
                        Resep tersedia
                      </p>

                      <span className="text-[10px] text-muted-foreground">
                        {item.recipe.bahan.length} bahan
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="manual">
          <ManualMenuForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
