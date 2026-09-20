import { z } from "zod";
import { createAllocation } from "@/shared/domain/production";
import { handleApiError, jsonOk, requireUser } from "@/shared/lib/http";
import { assertProductionBatchAccess } from "@/shared/domain/operational-scope";

const schema = z.object({
  schoolId: z.string().min(1),
  portionQty: z.number().int().positive(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(["SUPERVISOR", "KITCHEN"]);
    const { id } = await context.params;
    await assertProductionBatchAccess(user, id);
    const body = schema.parse(await request.json());
    const allocation = await createAllocation({
      productionBatchId: id,
      schoolId: body.schoolId,
      portionQty: body.portionQty,
      actorUserId: user.id,
    });
    return jsonOk(allocation, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
