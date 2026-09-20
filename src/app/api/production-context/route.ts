import { prisma } from "@/shared/db/prisma";
import { handleApiError, jsonOk, requireUser } from "@/shared/lib/http";

export async function GET() {
  try {
    const user = await requireUser(["SUPERVISOR", "KITCHEN"]);
    const [locations, teams] = await Promise.all([
      prisma.productionLocation.findMany({
        where: { sppgId: user.sppgId, active: true },
        orderBy: { name: "asc" },
      }),
      prisma.team.findMany({
        where: { sppgId: user.sppgId },
        include: {
          members: { include: { user: { select: { id: true, name: true, role: true } } } },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    return jsonOk({ locations, teams });
  } catch (error) {
    return handleApiError(error);
  }
}

