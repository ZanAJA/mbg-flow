import { z } from "zod";
import { prisma } from "@/shared/db/prisma";
import { handleApiError, jsonOk, requireUser, writeAudit } from "@/shared/lib/http";

const createSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  unit: z.string().min(1),
});

export async function GET() {
  try {
    await requireUser(["SUPERVISOR", "KITCHEN"]);
    const ingredients = await prisma.ingredient.findMany({
      include: { lots: true },
      orderBy: { name: "asc" },
    });
    return jsonOk(ingredients);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(["SUPERVISOR", "KITCHEN"]);
    const body = createSchema.parse(await request.json());
    const ingredient = await prisma.ingredient.create({ data: body });
    await writeAudit({
      actorUserId: user.id,
      action: "ingredient_created",
      entityType: "Ingredient",
      entityId: ingredient.id,
      after: ingredient,
    });
    return jsonOk(ingredient, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
