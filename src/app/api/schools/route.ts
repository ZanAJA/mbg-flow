import { prisma } from "@/shared/db/prisma";
import { handleApiError, jsonOk, requireUser } from "@/shared/lib/http";

export async function GET() {
  try {
    await requireUser(["SUPERVISOR", "KITCHEN", "DISTRIBUTOR"]);
    const schools = await prisma.school.findMany({ orderBy: { distanceKm: "desc" } });
    return jsonOk(schools);
  } catch (error) {
    return handleApiError(error);
  }
}
