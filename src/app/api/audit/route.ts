import { prisma } from "@/shared/db/prisma";
import { handleApiError, jsonOk, requireUser } from "@/shared/lib/http";

export async function GET() {
  try {
    await requireUser(["SUPERVISOR"]);
    const logs = await prisma.auditLog.findMany({
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return jsonOk(logs);
  } catch (error) {
    return handleApiError(error);
  }
}
