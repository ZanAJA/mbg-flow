import { z } from "zod";
import { prisma } from "@/shared/db/prisma";
import { handleApiError, HttpError, jsonOk, requireUser, writeAudit } from "@/shared/lib/http";

const patchSchema = z.object({
  name: z.string().trim().min(2).optional(),
  category: z.string().trim().min(2).optional(),
  unit: z.string().trim().min(1).optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser(["SUPERVISOR", "KITCHEN"]);
    const { id } = await context.params;
    const ingredient = await prisma.ingredient.findUnique({
      where: { id },
      include: { lots: { orderBy: { expiryDate: "asc" } } },
    });
    if (!ingredient) throw new HttpError(404, "Bahan tidak ditemukan.");
    return jsonOk(ingredient);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(["SUPERVISOR", "KITCHEN"]);
    const { id } = await context.params;
    const body = patchSchema.parse(await request.json());
    const existing = await prisma.ingredient.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Bahan tidak ditemukan.");

    const ingredient = await prisma.ingredient.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        category: body.category ?? existing.category,
        unit: body.unit ?? existing.unit,
      },
    });

    await writeAudit({
      actorUserId: user.id,
      action: "ingredient_updated",
      entityType: "Ingredient",
      entityId: ingredient.id,
      before: existing,
      after: ingredient,
    });
    return jsonOk(ingredient);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(["SUPERVISOR", "KITCHEN"]);
    const { id } = await context.params;
    const existing = await prisma.ingredient.findUnique({
      where: { id },
      include: { lots: { take: 1 } },
    });
    if (!existing) throw new HttpError(404, "Bahan tidak ditemukan.");
    if (existing.lots.length > 0) {
      throw new HttpError(409, "Bahan masih punya lot. Hapus lot dulu atau kosongkan stok.");
    }

    await prisma.ingredient.delete({ where: { id } });
    await writeAudit({
      actorUserId: user.id,
      action: "ingredient_deleted",
      entityType: "Ingredient",
      entityId: id,
      before: existing,
    });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
