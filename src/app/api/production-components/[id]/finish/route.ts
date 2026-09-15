import { finishComponent } from "@/shared/domain/production";
import { handleApiError, jsonOk, requireUser } from "@/shared/lib/http";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(["SUPERVISOR", "KITCHEN"]);
    await request.json().catch(() => ({}));
    const { id } = await context.params;
    const component = await finishComponent(id, user.id);
    return jsonOk(component);
  } catch (error) {
    return handleApiError(error);
  }
}
