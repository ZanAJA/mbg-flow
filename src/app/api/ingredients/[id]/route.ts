import { prisma } from "@/shared/db/prisma";
import { handleApiError, HttpError, jsonOk, requireUser } from "@/shared/lib/http";

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
