import { startComponent } from "@/shared/domain/production";
import { handleApiError, jsonOk, requireUser } from "@/shared/lib/http";
import { assertComponentAccess } from "@/shared/domain/operational-scope";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(["SUPERVISOR", "KITCHEN"]);
    await request.json().catch(() => ({}));
    const { id } = await context.params;
    await assertComponentAccess(user, id);
    const component = await startComponent(id, user.id);
    return jsonOk(component);
  } catch (error) {
    return handleApiError(error);
  }
}
