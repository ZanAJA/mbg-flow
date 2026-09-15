import { prisma } from "@/shared/db/prisma";
import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";

type RecipeItem = { name: string; qtyPer100: number; unit: string };
type Recipe = { porsiDasar: number; langkah: string[]; bahan: RecipeItem[] };
type RankedMenu = Awaited<ReturnType<typeof rankMenusFromCatalog>>["items"][number];

export type MenuRecommendationInput = {
  mainIngredients: { name: string; quantity: number }[];
  targetPortions: number;
};

const aiRecommendationSchema = z.object({
  items: z.array(
    z.object({
      menuId: z.string(),
      score: z.number().min(0).max(100),
      rationale: z.array(z.string()).min(1),
    }),
  ),
  note: z.string(),
});

async function rankMenusFromCatalog(input: MenuRecommendationInput) {
  const menus = await prisma.menu.findMany();
  const lots = await prisma.ingredientLot.findMany({ include: { ingredient: true } });
  const stockByName = new Map<string, number>();
  const nearestExpiry = new Map<string, Date>();

  for (const lot of lots) {
    const name = lot.ingredient.name.toLowerCase();
    stockByName.set(name, (stockByName.get(name) ?? 0) + lot.quantity);
    const current = nearestExpiry.get(name);
    if (!current || lot.expiryDate < current) nearestExpiry.set(name, lot.expiryDate);
  }

  const requested = input.mainIngredients.map((i) => i.name.toLowerCase());

  const ranked = menus
    .map((menu) => {
      const recipe = JSON.parse(menu.recipeJson) as Recipe;
      const scale = input.targetPortions / (recipe.porsiDasar || 100);
      const needs = recipe.bahan.map((bahan) => {
        const required = Number((bahan.qtyPer100 * scale).toFixed(2));
        const available = stockByName.get(bahan.name.toLowerCase()) ?? 0;
        return {
          name: bahan.name,
          unit: bahan.unit,
          required,
          available,
          shortage: Math.max(0, Number((required - available).toFixed(2))),
        };
      });

      const coverage =
        needs.length === 0
          ? 0
          : needs.filter((n) => n.available >= n.required).length / needs.length;
      const requestedHits = requested.filter((name) =>
        needs.some((n) => n.name.toLowerCase().includes(name) || name.includes(n.name.toLowerCase())),
      ).length;
      const fefoBoost = needs.reduce((score, need) => {
        const expiry = nearestExpiry.get(need.name.toLowerCase());
        if (!expiry) return score;
        const days = (expiry.getTime() - Date.now()) / 86_400_000;
        if (days <= 2) return score + 8;
        if (days <= 5) return score + 4;
        return score;
      }, 0);

      const score = coverage * 70 + requestedHits * 12 + fefoBoost;
      return {
        menuId: menu.id,
        name: menu.name,
        source: menu.source,
        score: Number(score.toFixed(1)),
        durabilityNote: menu.durabilityNote,
        recipe,
        needs,
        components: JSON.parse(menu.recommendedComponents) as {
          key: string;
          name: string;
          sortOrder: number;
        }[],
        rationale: [
          requestedHits > 0
            ? `Cocok dengan bahan utama yang dipilih (${requestedHits} kecocokan).`
            : "Tidak memakai semua bahan utama yang dipilih, tetap bisa diproduksi dari stok lain.",
          coverage >= 1
            ? "Stok saat ini mencukupi seluruh kebutuhan resep."
            : "Ada bahan yang kurang; lengkapi lot sebelum produksi penuh.",
          fefoBoost > 0
            ? "Memakai lot yang mendekati expiry, selaras prinsip FEFO."
            : "Tidak ada tekanan expiry mendesak pada bahan menu ini.",
          menu.durabilityNote,
        ],
      };
    })
    .sort((a, b) => b.score - a.score);

  return {
    generatedAt: new Date().toISOString(),
    targetPortions: input.targetPortions,
    engine: "constrained-catalog-ranker",
    note: "Peringkat menu dihasilkan dari katalog + stok. Batas aman konsumsi tidak berasal dari peringkat ini; rule engine tervalidasi yang menetapkan safe_until.",
    items: ranked,
  };
}

async function rankMenusWithAi(input: MenuRecommendationInput, candidates: RankedMenu[]) {
  const { output } = await generateText({
    model: openai(process.env.AI_MENU_MODEL || "gpt-5-mini"),
    output: Output.object({
      schema: aiRecommendationSchema,
    }),
    system:
      "You rank school meal menu candidates for an SPPG kitchen. Only use menuId values from the supplied candidates. Do not invent recipes, safety rules, stock, or deadlines. Safety deadlines are handled by a separate validated rule engine.",
    prompt: JSON.stringify({
      targetPortions: input.targetPortions,
      requestedIngredients: input.mainIngredients,
      candidates: candidates.map((candidate) => ({
        menuId: candidate.menuId,
        name: candidate.name,
        catalogScore: candidate.score,
        durabilityNote: candidate.durabilityNote,
        needs: candidate.needs,
        currentRationale: candidate.rationale,
      })),
    }),
  });

  const byMenuId = new Map(candidates.map((candidate) => [candidate.menuId, candidate]));
  const aiItems = output.items
    .map((item) => {
      const candidate = byMenuId.get(item.menuId);
      if (!candidate) return null;
      return {
        ...candidate,
        score: Number(item.score.toFixed(1)),
        rationale: item.rationale,
      };
    })
    .filter((item): item is RankedMenu => item !== null);

  const included = new Set(aiItems.map((item) => item.menuId));
  const remaining = candidates.filter((candidate) => !included.has(candidate.menuId));

  return {
    generatedAt: new Date().toISOString(),
    targetPortions: input.targetPortions,
    engine: "vercel-ai-sdk-openai-structured-output",
    note: output.note,
    items: [...aiItems, ...remaining],
  };
}

export async function recommendMenus(input: MenuRecommendationInput) {
  const catalogSnapshot = await rankMenusFromCatalog(input);

  if (!process.env.OPENAI_API_KEY) {
    return catalogSnapshot;
  }

  try {
    return await rankMenusWithAi(input, catalogSnapshot.items);
  } catch (error) {
    console.error("AI menu recommendation failed; using catalog ranker fallback.", error);
    return {
      ...catalogSnapshot,
      note: `${catalogSnapshot.note} AI structured output unavailable; fallback ranker used.`,
    };
  }
}
