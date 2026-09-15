import { z } from "zod";
import { prisma } from "@/shared/db/prisma";
import { handleApiError, jsonOk, requireUser, writeAudit } from "@/shared/lib/http";

const lotSchema = z.object({
  ingredientId: z.string().min(1),
  lotCode: z.string().min(2),
  quantity: z.number().positive(),
  expiryDate: z.string().min(4),
  storageType: z.string().min(2),
  supplier: z.string().min(2),
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
    const lot = await prisma.ingredientLot.create({
      data: {
        ingredientId: body.ingredientId,
        lotCode: body.lotCode,
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
