import { z } from "zod";
import { markPacked } from "@/shared/domain/production";
import { handleApiError, jsonOk, requireUser } from "@/shared/lib/http";

const schema = z.object({
  packedQty: z.number().int().nonnegative(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(["SUPERVISOR", "KITCHEN"]);
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    const allocation = await markPacked({
      allocationId: id,
      packedQty: body.packedQty,
      actorUserId: user.id,
    });
    return jsonOk(allocation);
  } catch (error) {
    return handleApiError(error);
  }
}
