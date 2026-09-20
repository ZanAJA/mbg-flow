import { prisma } from "@/shared/db/prisma";
import { HttpError } from "@/shared/lib/http";
import {
  findMenuImage,
  type MenuImageResult,
} from "@/shared/lib/menu-image-search";
import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";

type RecipeItem = {
  name: string;
  qtyPer100: number;
  unit: string;
};

type Recipe = {
  porsiDasar: number;
  langkah: string[];
  bahan: RecipeItem[];
};

export type MenuRecommendationInput = {
  mainIngredients: {
    name: string;
    quantity: number;
  }[];
  targetPortions: number;
};

const aiGeneratedMenuSchema = z.object({
  menus: z
    .array(
      z.object({
        name: z.string().min(1),
        durabilityCategory: z.enum([
          "LEBIH_TAHAN",
          "SEDANG",
          "LEBIH_CEPAT_RUSAK",
        ]),

        durabilityNote: z.string().min(1),

        imageKeywords: z
          .array(z.string().min(2))
          .min(2)
          .max(6),

        components: z.array(
          z.object({
            key: z.string().min(1),
            name: z.string().min(1),
          }),
        ),

        recipe: z.object({
          porsiDasar: z.number().positive(),

          bahan: z
            .array(
              z.object({
                name: z.string().min(1),
                qtyPer100: z.number().nonnegative(),
                unit: z.string().min(1),
              }),
            )
            .min(1),

          langkah: z
            .array(z.string().min(1))
            .min(1),
        }),

        rationale: z
          .array(z.string().min(1))
          .min(1),
      }),
    )
    .min(3)
    .max(5),

  note: z.string().min(1),
});

type GeneratedMenu = z.infer<typeof aiGeneratedMenuSchema>["menus"][number];

type MenuCandidate = GeneratedMenu & {
  durabilityRank: number;
  needs: Array<{
    name: string;
    required: number;
    available: number;
    unit: string;
    shortage: number;
  }>;
};

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function getDurabilityRank(
  category: GeneratedMenu["durabilityCategory"],
) {
  switch (category) {
    case "LEBIH_TAHAN":
      return 3;

    case "SEDANG":
      return 2;

    case "LEBIH_CEPAT_RUSAK":
      return 1;
  }
}

async function getStockSnapshot() {
  const lots = await prisma.ingredientLot.findMany({
    include: {
      ingredient: true,
    },
  });

  const stockByName = new Map<string, number>();

  for (const lot of lots) {
    const name = normalizeName(
      lot.ingredient.name,
    );

    stockByName.set(
      name,
      (stockByName.get(name) ?? 0) +
        Number(lot.quantity),
    );
  }

  return stockByName;
}

function calculateNeeds(
  recipe: Recipe,
  targetPortions: number,
  stockByName: Map<string, number>,
) {
  const scale = targetPortions / (recipe.porsiDasar || 100);
  return recipe.bahan.map((bahan) => {
    const required = Number(
      (
        bahan.qtyPer100 * scale
      ).toFixed(2),
    );

    const available = Number(
      stockByName.get(
        normalizeName(bahan.name),
      ) ?? 0,
    );

    const shortage = Math.max(
      0,
      Number(
        (required - available).toFixed(2),
      ),
    );

    return {
      name: bahan.name,
      required,
      available,
      unit: bahan.unit,
      shortage,
    };
  });
}

async function generateMenusWithAi(
  input: MenuRecommendationInput,
) {
  const { output } = await generateText({
    model: google(process.env.AI_MENU_MODEL || "gemini-3.5-flash-lite"),
    output: Output.object({
      schema: aiGeneratedMenuSchema,
    }),
    system: [
      "You are an AI menu planner for an Indonesian SPPG school-meal kitchen.",
      "Generate 5-10 practical Indonesian school-meal menu candidates from the supplied main ingredients.",
      "Every menu must contain a complete recipe include carbohydrates, proteins, vegetables, fruits, and healthy fats.",
      "Every recipe must contain ingredients with quantities per 100 portions and cooking steps.",
      "For each completed menu, provide 2-6 concise image search keywords describing the full plated meal, not merely the supplied main ingredients.",
      "Use the supplied main ingredients whenever they are appropriate for the menu.",
      "Recipes must be realistic for large-scale SPPG kitchen production.",
      "Classify the general durability characteristic of the finished food into exactly one of: LEBIH_TAHAN, SEDANG, or LEBIH_CEPAT_RUSAK.",
      "LEBIH_TAHAN means the finished food generally has characteristics that make it less prone to rapid quality deterioration compared with the other generated candidates.",
      "SEDANG means moderate durability characteristics.",
      "LEBIH_CEPAT_RUSAK means the finished food generally deteriorates more quickly compared with the other generated candidates.",
      "Do not provide exact safe consumption hours.",
      "Do not provide safe_until timestamps.",
      "Do not claim that a menu is food-safe for a specific duration.",
      "Do not invent current stock quantities.",
      "Do not calculate inventory availability.",
      "Write all output in clear Bahasa Indonesia.",
      "Do not use markdown.",
    ].join(" "),
    prompt: JSON.stringify({
      targetPortions: input.targetPortions,
      requestedIngredients: input.mainIngredients,
      requirements: [
        "Buat 5-10 menu berbeda dari bahan utama input.",
        "Setiap menu harus memiliki resep lengkap termasuk Karbohidrat, Protein & Nabati, Sayuran, Buah-buahan, Sedikit Lemak Sehat.",
        "Setiap resep harus memiliki bahan, jumlah per 100 porsi, dan langkah memasak.",
        "Gunakan bahan utama dari input jika sesuai.",
        "Buat kata kunci gambar dari nama dan komposisi menu lengkap, bukan hanya bahan utama input.",
        "Menu harus realistis untuk produksi MBG di SPPG.",
        "Klasifikasikan ketahanan makanan secara relatif.",
      ],
    }),
  });

  return output;
}

function enrichGeneratedMenus(
  menus: GeneratedMenu[],
  targetPortions: number,
  stockByName: Map<string, number>,
): MenuCandidate[] {
  return menus.map((menu) => {
    const recipe =
      menu.recipe as Recipe;

    const needs = calculateNeeds(
      recipe,
      targetPortions,
      stockByName,
    );

    return {
      ...menu,

      durabilityRank:
        getDurabilityRank(
          menu.durabilityCategory,
        ),

      needs,
    };
  });
}

function rankGeneratedMenus(
  menus: MenuCandidate[],
) {
  return [...menus].sort(
    (a, b) => {
      if (
        b.durabilityRank !==
        a.durabilityRank
      ) {
        return (
          b.durabilityRank -
          a.durabilityRank
        );
      }

      const shortageA =
        a.needs.reduce(
          (total, item) =>
            total + item.shortage,
          0,
        );

      const shortageB =
        b.needs.reduce(
          (total, item) =>
            total + item.shortage,
          0,
        );

      return shortageA - shortageB;
    },
  );
}

async function saveGeneratedMenus(
  menus: MenuCandidate[],
) {
  const images: Array<MenuImageResult | null> = [];
  const usedImageUrls = new Set<string>();

  for (const menu of menus) {
    const image = await findMenuImage(
      menu.name,
      menu.imageKeywords,
      usedImageUrls,
    );
    images.push(image);
    if (image) usedImageUrls.add(image.imageUrl);
  }

  return prisma.$transaction(
    menus.map((menu, index) =>
      prisma.menu.create({
        data: {
          name: menu.name,
          source: "AI",
          durabilityNote: menu.durabilityNote,
          recipeJson: JSON.stringify(
            menu.recipe,
          ),
          recommendedComponents:
            JSON.stringify(
              menu.components.map(
                (component, index) => ({
                  ...component,
                  sortOrder: index,
                }),
              ),
            ),
          ...(images[index] ?? {}),
        },
      }),
    ),
  );
}

export async function recommendMenus(
  input: MenuRecommendationInput,
) {
  if (
    !process.env
      .GOOGLE_GENERATIVE_AI_API_KEY
      ?.trim()
  ) {
    throw new HttpError(
      503,
      "GOOGLE_GENERATIVE_AI_API_KEY belum dikonfigurasi.",
    );
  }

  if (
    !input.targetPortions ||
    input.targetPortions <= 0
  ) {
    throw new HttpError(
      400,
      "Target porsi harus lebih dari 0.",
    );
  }

  if (
    !input.mainIngredients?.length
  ) {
    throw new HttpError(
      400,
      "Minimal satu bahan utama harus diberikan.",
    );
  }

  try {
    const stockByName = await getStockSnapshot();
    const generated = await generateMenusWithAi(input);
    const enriched = enrichGeneratedMenus(
        generated.menus,
        input.targetPortions,
        stockByName,
      );
    const ranked = rankGeneratedMenus(enriched,);
    const savedMenus = await saveGeneratedMenus(ranked,);
    const items = ranked.map(
      (menu, index) => {
        const savedMenu =
          savedMenus[index];

        return {
          menuId: savedMenu.id,
          rank: index + 1,
          name: savedMenu.name,
          durabilityCategory: menu.durabilityCategory,
          durabilityRank: menu.durabilityRank,
          durabilityNote: savedMenu.durabilityNote,
          imageUrl: savedMenu.imageUrl,
          imageSourceUrl: savedMenu.imageSourceUrl,
          imageAttribution: savedMenu.imageAttribution,
          imageLicense: savedMenu.imageLicense,
          recipe: menu.recipe,
          components: menu.components,
          needs: menu.needs,
          rationale: menu.rationale,
        };
      },
    );

    return {
      generatedAt: new Date().toISOString(),
      targetPortions: input.targetPortions,
      engine: "gemini-menu-generator-durability-ranker",
      note:
        "AI menghasilkan menu dan resep.",
      items,
    };
  } catch (error) {
    console.error(
      "AI menu generation failed.",
      error,
    );

    if (
      error instanceof HttpError
    ) {
      throw error;
    }

    const detail =
      error instanceof Error
        ? error.message
        : "unknown error";

    throw new HttpError(
      502,
      `Generate menu AI gagal (${detail}).`,
    );
  }
}
