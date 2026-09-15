import { z } from "zod";
import { recommendMenus } from "@/shared/domain/ai-menu";
import { prisma } from "@/shared/db/prisma";
import { handleApiError, jsonOk, requireUser, writeAudit } from "@/shared/lib/http";

const schema = z.object({
  mainIngredients: z
    .array(z.object({ name: z.string().min(1), quantity: z.number().nonnegative() }))
    .min(1),
  targetPortions: z.number().int().positive(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser(["SUPERVISOR", "KITCHEN"]);
    const body = schema.parse(await request.json());
    const snapshot = await recommendMenus(body);

    const top = snapshot.items[0];
    if (top) {
      await prisma.menu.update({
        where: { id: top.menuId },
        data: { aiSnapshot: JSON.stringify(snapshot) },
      });
    }

    await writeAudit({
      actorUserId: user.id,
      action: "ai_menu_recommendation",
      entityType: "Menu",
      entityId: top?.menuId ?? "catalog",
      after: { engine: snapshot.engine, top: top?.name, targetPortions: body.targetPortions },
    });

    return jsonOk(snapshot);
  } catch (error) {
    return handleApiError(error);
  }
}
