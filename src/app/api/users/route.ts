import { prisma } from "@/shared/db/prisma";
import { handleApiError, jsonOk, requireUser } from "@/shared/lib/http";

export async function GET() {
  try {
    await requireUser(["SUPERVISOR"]);
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        sppg: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });
    return jsonOk(users);
  } catch (error) {
    return handleApiError(error);
  }
}
