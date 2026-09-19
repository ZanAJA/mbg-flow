import { z } from "zod";
import { prisma } from "@/shared/db/prisma";
import { handleApiError, jsonOk, requireUser, writeAudit } from "@/shared/lib/http";

const createSchema = z.object({
  name: z.string().trim().min(3).max(100),
  durabilityNote: z.string().trim().min(5).max(300),
  recipe: z.object({
    porsiDasar: z.number().int().positive(),
    bahan: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(100),
          qtyPer100: z.number().positive(),
          unit: z.string().trim().min(1).max(30),
        }),
      )
      .min(1),
    langkah: z.array(z.string().trim().min(3).max(500)).min(1),
  }),
});

const manualComponents = [
  { key: "nasi", name: "Siapkan karbohidrat", sortOrder: 0 },
  { key: "protein", name: "Masak lauk protein", sortOrder: 1 },
  { key: "sayur", name: "Masak sayur", sortOrder: 2 },
  { key: "packing", name: "Pengemasan", sortOrder: 3 },
  { key: "qc", name: "Quality check", sortOrder: 4 },
];

export async function GET() {
  try {
    await requireUser(["SUPERVISOR", "KITCHEN"]);
    const menus = await prisma.menu.findMany({ orderBy: { name: "asc" } });
    return jsonOk(
      menus.map((menu) => ({
        ...menu,
        recipe: JSON.parse(menu.recipeJson),
        components: JSON.parse(menu.recommendedComponents),
      })),
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(["SUPERVISOR", "KITCHEN"]);
    const body = createSchema.parse(await request.json());
    const menu = await prisma.menu.create({
      data: {
        name: body.name,
        source: "MANUAL",
        durabilityNote: body.durabilityNote,
        recipeJson: JSON.stringify(body.recipe),
        recommendedComponents: JSON.stringify(manualComponents),
      },
    });

    await writeAudit({
      actorUserId: user.id,
      action: "manual_menu_created",
      entityType: "Menu",
      entityId: menu.id,
      after: { name: menu.name, source: menu.source },
    });

    return jsonOk({ id: menu.id }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
