import { prisma } from "@/shared/db/prisma";
import { handleApiError, HttpError, jsonOk, requireUser } from "@/shared/lib/http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser(["SUPERVISOR", "KITCHEN"]);
    const { id } = await context.params;
    const menu = await prisma.menu.findUnique({ where: { id } });
    if (!menu) throw new HttpError(404, "Menu tidak ditemukan.");
    return jsonOk({
      ...menu,
      recipe: JSON.parse(menu.recipeJson),
      components: JSON.parse(menu.recommendedComponents),
      aiSnapshot: menu.aiSnapshot ? JSON.parse(menu.aiSnapshot) : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
