import { startDelivery } from "@/shared/domain/production";
import { handleApiError, jsonOk, requireUser } from "@/shared/lib/http";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(["SUPERVISOR", "DISTRIBUTOR"]);
    const { id } = await context.params;
    const delivery = await startDelivery(id, user.id);
    return jsonOk(delivery);
  } catch (error) {
    return handleApiError(error);
  }
}
