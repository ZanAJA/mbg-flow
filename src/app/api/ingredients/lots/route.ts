import { z } from "zod";
import { prisma } from "@/shared/db/prisma";
import { nextLotCode } from "@/shared/domain/lots";
import { handleApiError, jsonOk, requireUser, writeAudit } from "@/shared/lib/http";

const lotSchema = z
  .object({
    ingredientId: z.string().optional(),
    name: z.string().trim().min(2).optional(),
    category: z.string().trim().min(2).optional(),
    unit: z.string().trim().min(1).optional(),
    quantity: z.number().positive(),
    expiryDate: z.string().min(4),
    storageType: z.string().min(2),
    supplier: z.string().min(2),
  })
  .refine((v) => Boolean(v.ingredientId) || Boolean(v.name), {
    message: "Isi nama bahan atau pilih bahan yang ada.",
    path: ["name"],
  });

export async function GET() {
  try {
    await requireUser(["SUPERVISOR", "KITCHEN"]);
    const lots = await prisma.ingredientLot.findMany({
      include: { ingredient: true },
      orderBy: { expiryDate: "asc" },
    });
    return jsonOk(lots);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(["SUPERVISOR", "KITCHEN"]);
    const body = lotSchema.parse(await request.json());
    const receivedAt = new Date();

    let ingredientId = body.ingredientId;
    if (!ingredientId) {
      const name = body.name!.trim();
      const existing = await prisma.ingredient.findFirst({
        where: { name: { equals: name, mode: "insensitive" } },
      });
      if (existing) {
        ingredientId = existing.id;
        if (body.category || body.unit) {
          await prisma.ingredient.update({
            where: { id: existing.id },
            data: {
              category: body.category ?? existing.category,
              unit: body.unit ?? existing.unit,
            },
          });
        }
      } else {
        const created = await prisma.ingredient.create({
          data: {
            name,
            category: body.category ?? "Umum",
            unit: body.unit ?? "kg",
          },
        });
        ingredientId = created.id;
        await writeAudit({
          actorUserId: user.id,
          action: "ingredient_created",
          entityType: "Ingredient",
          entityId: created.id,
          after: created,
        });
      }
    }

    const lotCode = await nextLotCode(ingredientId, receivedAt);
    const lot = await prisma.ingredientLot.create({
      data: {
        ingredientId,
        lotCode,
        quantity: body.quantity,
        expiryDate: new Date(body.expiryDate),
        receivedAt,
        storageType: body.storageType,
        supplier: body.supplier,
        status: "AVAILABLE",
      },
      include: { ingredient: true },
    });
    await writeAudit({
      actorUserId: user.id,
      action: "ingredient_lot_received",
      entityType: "IngredientLot",
      entityId: lot.id,
      after: lot,
    });
    return jsonOk(lot, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
