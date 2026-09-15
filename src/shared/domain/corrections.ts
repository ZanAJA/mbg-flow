import { prisma } from "@/shared/db/prisma";
import { HttpError, writeAudit } from "@/shared/lib/http";
import { componentSafeUntil } from "@/shared/safety/engine";
import { recalcProductionBatch } from "@/shared/domain/production";

export async function correctEntity(input: {
  entity: string;
  entityId: string;
  reason: string;
  patch: Record<string, unknown>;
  actorUserId: string;
}) {
  if (!input.reason.trim()) {
    throw new HttpError(400, "Koreksi supervisor wajib menyertakan alasan.");
  }

  if (input.entity === "component") {
    const current = await prisma.productionComponent.findUnique({
      where: { id: input.entityId },
    });
    if (!current) throw new HttpError(404, "Komponen tidak ditemukan.");

    const data: {
      startedAt?: Date;
      finishedAt?: Date;
      safeUntil?: Date | null;
    } = {};

    if (typeof input.patch.startedAt === "string") {
      data.startedAt = new Date(input.patch.startedAt);
    }
    if (typeof input.patch.finishedAt === "string") {
      data.finishedAt = new Date(input.patch.finishedAt);
      data.safeUntil = componentSafeUntil({
        finishedAt: data.finishedAt,
        safeWindowMinutes: current.safeWindowMinutes,
        affectsSafetyDeadline: current.affectsSafetyDeadline,
      });
    }

    const updated = await prisma.productionComponent.update({
      where: { id: current.id },
      data,
    });
    await writeAudit({
      actorUserId: input.actorUserId,
      action: "supervisor_correction",
      entityType: "ProductionComponent",
      entityId: current.id,
      before: current,
      after: updated,
      reason: input.reason,
    });
    await recalcProductionBatch(current.productionBatchId);
    return updated;
  }

  if (input.entity === "lot") {
    const current = await prisma.ingredientLot.findUnique({ where: { id: input.entityId } });
    if (!current) throw new HttpError(404, "Lot tidak ditemukan.");
    const data: { quantity?: number; expiryDate?: Date } = {};
    if (typeof input.patch.quantity === "number") data.quantity = input.patch.quantity;
    if (typeof input.patch.expiryDate === "string") data.expiryDate = new Date(input.patch.expiryDate);
    const updated = await prisma.ingredientLot.update({
      where: { id: current.id },
      data,
    });
    await writeAudit({
      actorUserId: input.actorUserId,
      action: "supervisor_correction",
      entityType: "IngredientLot",
      entityId: current.id,
      before: current,
      after: updated,
      reason: input.reason,
    });
    return updated;
  }

  throw new HttpError(400, "Jenis entitas koreksi tidak didukung.");
}
