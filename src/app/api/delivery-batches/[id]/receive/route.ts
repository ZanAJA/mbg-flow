import { receiveDelivery } from "@/shared/domain/production";
import { handleApiError, jsonOk, requireUser } from "@/shared/lib/http";
import { assertDeliveryAccess } from "@/shared/domain/operational-scope";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(["SUPERVISOR", "DISTRIBUTOR"]);
    const { id } = await context.params;
    await assertDeliveryAccess(user, id);
    const delivery = await receiveDelivery(id, user.id);
    return jsonOk(delivery);
  } catch (error) {
    return handleApiError(error);
  }
}
