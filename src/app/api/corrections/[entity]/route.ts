import { z } from "zod";
import { correctEntity } from "@/shared/domain/corrections";
import { handleApiError, jsonOk, requireUser } from "@/shared/lib/http";

const schema = z.object({
  entityId: z.string().min(1),
  reason: z.string().min(3),
  patch: z.record(z.string(), z.unknown()),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ entity: string }> },
) {
  try {
    const user = await requireUser(["SUPERVISOR"]);
    const { entity } = await context.params;
    const body = schema.parse(await request.json());
    const updated = await correctEntity({
      entity,
      entityId: body.entityId,
      reason: body.reason,
      patch: body.patch,
      actorUserId: user.id,
    });
    return jsonOk(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
