import { prisma } from "@/shared/db/prisma";
import { handleApiError, jsonOk, requireUser } from "@/shared/lib/http";

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
