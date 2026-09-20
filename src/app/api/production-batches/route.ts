import { z } from "zod";
import { prisma } from "@/shared/db/prisma";
import { createProductionBatch } from "@/shared/domain/production";
import { serializeBatch } from "@/shared/domain/serializers";
import { productionBatchScope } from "@/shared/domain/operational-scope";
import { handleApiError, HttpError, jsonOk, requireUser } from "@/shared/lib/http";

const createSchema = z.object({
  menuId: z.string().min(1),
  portionType: z.enum(["BESAR", "KECIL"]),
  targetQty: z.number().int().positive(),
  productionLocationId: z.string().min(1),
  kitchenTeamId: z.string().min(1).optional(),
  driverTeamId: z.string().min(1).optional(),
});

export async function GET() {
  try {
    const user = await requireUser(["SUPERVISOR", "KITCHEN", "DISTRIBUTOR"]);
    const now = new Date();
    const batches = await prisma.productionBatch.findMany({
      where: productionBatchScope(user),
      include: {
        menu: true,
        sppg: true,
        productionLocation: true,
        kitchenTeam: true,
        driverTeam: true,
        components: { orderBy: { sortOrder: "asc" } },
        allocations: { include: { school: true, deliveryBatch: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return jsonOk(batches.map((batch) => serializeBatch(batch, now)));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(["SUPERVISOR", "KITCHEN"]);
    const body = createSchema.parse(await request.json());

    const location = await prisma.productionLocation.findFirst({
      where: { id: body.productionLocationId, sppgId: user.sppgId, active: true },
    });
    if (!location) throw new HttpError(400, "Lokasi produksi tidak valid.");

    if (user.role !== "SUPERVISOR" && (body.kitchenTeamId || body.driverTeamId)) {
      throw new HttpError(403, "Hanya supervisor yang dapat menentukan tim.");
    }

    const selectedTeamIds = [body.kitchenTeamId, body.driverTeamId].filter(
      (id): id is string => Boolean(id),
    );
    const teams = selectedTeamIds.length
      ? await prisma.team.findMany({
          where: { id: { in: selectedTeamIds }, sppgId: user.sppgId },
          include: { members: { include: { user: { select: { role: true } } } } },
        })
      : [];
    if (teams.length !== selectedTeamIds.length) {
      throw new HttpError(400, "Tim yang dipilih tidak valid.");
    }
    const kitchenTeam = teams.find((team) => team.id === body.kitchenTeamId);
    const driverTeam = teams.find((team) => team.id === body.driverTeamId);
    if (kitchenTeam && !kitchenTeam.members.some((member) => member.user.role === "KITCHEN")) {
      throw new HttpError(400, "Tim dapur harus memiliki anggota dengan peran dapur.");
    }
    if (driverTeam && !driverTeam.members.some((member) => member.user.role === "DISTRIBUTOR")) {
      throw new HttpError(400, "Tim pengemudi harus memiliki anggota distributor.");
    }

    const batch = await createProductionBatch({
      ...body,
      sppgId: user.sppgId,
      actorUserId: user.id,
      productionLocationId: body.productionLocationId,
      kitchenTeamId: body.kitchenTeamId,
      driverTeamId: body.driverTeamId,
    });
    return jsonOk(serializeBatch(batch), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
