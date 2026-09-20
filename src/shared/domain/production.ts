import { randomUUID } from "node:crypto";
import { prisma } from "@/shared/db/prisma";
import { HttpError, writeAudit } from "@/shared/lib/http";
import { componentSafeUntil, productionBatchSafeUntil } from "@/shared/safety/engine";
import { deriveProductionStatus, etaFromDistanceKm, isAllocationValid } from "@/shared/domain/rules";
import { distanceOrFallback } from "@/shared/lib/geo";

export { deriveProductionStatus, etaFromDistanceKm, isAllocationValid };

export type ComponentTemplate = {
  key: string;
  name: string;
  sortOrder: number;
};

export async function nextProductionCode() {
  const count = await prisma.productionBatch.count();
  const seq = String(count + 1).padStart(2, "0");
  return `PB-A${seq}`;
}

export async function nextDeliveryCode(productionCode: string, schoolIndex: number) {
  return `${productionCode.replace("PB-", "DB-")}-S${String(schoolIndex).padStart(2, "0")}`;
}

export async function loadSafetyRule(componentKey: string) {
  const rule = await prisma.safetyRule.findUnique({ where: { componentKey } });
  if (rule?.validated) return rule;
  return prisma.safetyRule.findUnique({ where: { componentKey: "protein" } });
}

export async function recalcProductionBatch(batchId: string, actorUserId?: string) {
  const batch = await prisma.productionBatch.findUnique({
    where: { id: batchId },
    include: {
      components: true,
      allocations: { include: { deliveryBatch: true } },
    },
  });
  if (!batch) throw new HttpError(404, "Production batch tidak ditemukan.");

  const safeUntil = productionBatchSafeUntil(batch.components);
  const allFinished = batch.components.every((c) => c.status === "FINISHED");
  const readyAt = allFinished ? (batch.readyAt ?? new Date()) : batch.readyAt;
  const deliveryBatches = batch.allocations
    .map((a) => a.deliveryBatch)
    .filter((d): d is NonNullable<typeof d> => Boolean(d));

  const status = deriveProductionStatus({
    components: batch.components,
    deliveryBatches,
  });

  return prisma.productionBatch.update({
    where: { id: batchId },
    data: {
      safeUntil,
      readyAt,
      status,
    },
    include: {
      components: { orderBy: { sortOrder: "asc" } },
      allocations: { include: { school: true, deliveryBatch: true } },
      menu: true,
      sppg: true,
    },
  });
}

export async function startComponent(componentId: string, actorUserId: string) {
  const component = await prisma.productionComponent.findUnique({
    where: { id: componentId },
  });
  if (!component) throw new HttpError(404, "Komponen tidak ditemukan.");
  if (component.status === "IN_PROGRESS" || component.status === "FINISHED") {
    throw new HttpError(409, "Komponen sudah dimulai. Transisi berulang ditolak.");
  }
  const now = new Date();
  const updated = await prisma.productionComponent.update({
    where: { id: componentId },
    data: { status: "IN_PROGRESS", startedAt: now },
  });
  await writeAudit({
    actorUserId,
    action: "component_started",
    entityType: "ProductionComponent",
    entityId: componentId,
    before: component,
    after: updated,
  });
  await recalcProductionBatch(component.productionBatchId, actorUserId);
  return prisma.productionComponent.findUniqueOrThrow({ where: { id: componentId } });
}

export async function finishComponent(componentId: string, actorUserId: string) {
  const component = await prisma.productionComponent.findUnique({
    where: { id: componentId },
  });
  if (!component) throw new HttpError(404, "Komponen tidak ditemukan.");
  if (component.status !== "IN_PROGRESS") {
    throw new HttpError(409, "Komponen harus IN_PROGRESS sebelum diselesaikan.");
  }
  const now = new Date();
  const safeUntil = componentSafeUntil({
    finishedAt: now,
    safeWindowMinutes: component.safeWindowMinutes,
    affectsSafetyDeadline: component.affectsSafetyDeadline,
  });
  const updated = await prisma.productionComponent.update({
    where: { id: componentId },
    data: { status: "FINISHED", finishedAt: now, safeUntil },
  });
  await writeAudit({
    actorUserId,
    action: "component_finished",
    entityType: "ProductionComponent",
    entityId: componentId,
    before: component,
    after: updated,
  });
  await recalcProductionBatch(component.productionBatchId, actorUserId);
  return prisma.productionComponent.findUniqueOrThrow({ where: { id: componentId } });
}

export async function createProductionBatch(input: {
  menuId: string;
  portionType: "BESAR" | "KECIL";
  targetQty: number;
  sppgId: string;
  actorUserId: string;
  productionLocationId: string;
  kitchenTeamId?: string;
  driverTeamId?: string;
}) {
  if (input.targetQty <= 0) throw new HttpError(400, "Target porsi harus lebih dari 0.");
  const menu = await prisma.menu.findUnique({ where: { id: input.menuId } });
  if (!menu) throw new HttpError(404, "Menu tidak ditemukan.");
  const templates = JSON.parse(menu.recommendedComponents) as ComponentTemplate[];
  const code = await nextProductionCode();
  const rules = await prisma.safetyRule.findMany();
  const ruleByKey = Object.fromEntries(rules.map((r) => [r.componentKey, r]));

  const batch = await prisma.productionBatch.create({
    data: {
      code,
      date: new Date(),
      portionType: input.portionType,
      menuId: menu.id,
      menuSnapshot: JSON.stringify({
        name: menu.name,
        recipe: JSON.parse(menu.recipeJson),
        durabilityNote: menu.durabilityNote,
        source: menu.source,
        aiSnapshot: menu.aiSnapshot ? JSON.parse(menu.aiSnapshot) : null,
      }),
      targetQty: input.targetQty,
      actualQty: input.targetQty,
      status: "DRAFT",
      sppgId: input.sppgId,
      productionLocationId: input.productionLocationId,
      kitchenTeamId: input.kitchenTeamId,
      driverTeamId: input.driverTeamId,
      createdById: input.actorUserId,
      components: {
        create: templates.map((template) => {
          const rule = ruleByKey[template.key] ?? ruleByKey.protein;
          return {
            name: template.name,
            componentKey: template.key,
            sortOrder: template.sortOrder,
            affectsSafetyDeadline: rule?.affectsSafetyDeadline ?? true,
            safeWindowMinutes: rule?.safeWindowMinutes ?? 240,
            status: "NOT_STARTED",
          };
        }),
      },
    },
    include: {
      components: true,
      menu: true,
      sppg: true,
      productionLocation: true,
      kitchenTeam: true,
      driverTeam: true,
      allocations: true,
    },
  });

  await writeAudit({
    actorUserId: input.actorUserId,
    action: "production_batch_created",
    entityType: "ProductionBatch",
    entityId: batch.id,
    after: {
      code: batch.code,
      menuId: menu.id,
      targetQty: input.targetQty,
      productionLocationId: input.productionLocationId,
      kitchenTeamId: input.kitchenTeamId,
      driverTeamId: input.driverTeamId,
    },
  });

  return batch;
}

export async function createAllocation(input: {
  productionBatchId: string;
  schoolId: string;
  portionQty: number;
  actorUserId: string;
}) {
  if (input.portionQty <= 0) throw new HttpError(400, "Jumlah porsi harus lebih dari 0.");
  const batch = await prisma.productionBatch.findUnique({
    where: { id: input.productionBatchId },
    include: { allocations: { include: { deliveryBatch: true } }, sppg: true },
  });
  if (!batch) throw new HttpError(404, "Production batch tidak ditemukan.");
  const school = await prisma.school.findUnique({ where: { id: input.schoolId } });
  if (!school) throw new HttpError(404, "Sekolah tidak ditemukan.");
  if (batch.allocations.some((a) => a.schoolId === input.schoolId)) {
    throw new HttpError(409, "Sekolah ini sudah memiliki alokasi pada batch yang sama.");
  }

  const allocated = batch.allocations.reduce((sum, a) => sum + a.portionQty, 0);
  const available = batch.actualQty || batch.targetQty;
  if (allocated + input.portionQty > available) {
    throw new HttpError(
      400,
      `Total alokasi melebihi porsi tersedia (${available}). Sisa ${available - allocated} porsi.`,
    );
  }

  const distanceKm = distanceOrFallback({ from: batch.sppg, to: school });
  const schoolIndex = batch.allocations.length + 1;
  const code = await nextDeliveryCode(batch.code, schoolIndex);
  const allocation = await prisma.schoolAllocation.create({
    data: {
      productionBatchId: batch.id,
      schoolId: school.id,
      portionQty: input.portionQty,
      packedQty: 0,
      deliveryBatch: {
        create: {
          code,
          status: "PLANNED",
          etaMinutes: etaFromDistanceKm(distanceKm),
          qrToken: randomUUID(),
        },
      },
    },
    include: { school: true, deliveryBatch: true },
  });

  await writeAudit({
    actorUserId: input.actorUserId,
    action: "allocation_created",
    entityType: "SchoolAllocation",
    entityId: allocation.id,
    after: {
      school: school.name,
      portionQty: input.portionQty,
      deliveryCode: code,
    },
  });

  await recalcProductionBatch(batch.id);
  return allocation;
}

export async function markPacked(input: {
  allocationId: string;
  packedQty: number;
  actorUserId: string;
}) {
  const allocation = await prisma.schoolAllocation.findUnique({
    where: { id: input.allocationId },
    include: { deliveryBatch: true, batch: { include: { components: true } } },
  });
  if (!allocation) throw new HttpError(404, "Alokasi tidak ditemukan.");
  if (input.packedQty < 0 || input.packedQty > allocation.portionQty) {
    throw new HttpError(400, "Jumlah kemasan tidak valid.");
  }

  if (
    allocation.deliveryBatch &&
    (allocation.deliveryBatch.status === "IN_DELIVERY" ||
      allocation.deliveryBatch.status === "RECEIVED")
  ) {
    throw new HttpError(409, "Tidak dapat mengubah kemasan setelah pengiriman dimulai.");
  }

  const now = new Date();
  const ready = input.packedQty >= allocation.portionQty;
  const updated = await prisma.schoolAllocation.update({
    where: { id: allocation.id },
    data: {
      packedQty: input.packedQty,
      readyAt: ready ? (allocation.readyAt ?? now) : null,
    },
  });

  if (allocation.deliveryBatch) {
    if (ready && allocation.deliveryBatch.status === "PLANNED") {
      await prisma.deliveryBatch.update({
        where: { id: allocation.deliveryBatch.id },
        data: { status: "READY", readyAt: now },
      });
      await writeAudit({
        actorUserId: input.actorUserId,
        action: "delivery_batch_ready",
        entityType: "DeliveryBatch",
        entityId: allocation.deliveryBatch.id,
        after: { packedQty: input.packedQty, readyAt: now },
      });
    } else if (!ready && allocation.deliveryBatch.status === "READY") {
      await prisma.deliveryBatch.update({
        where: { id: allocation.deliveryBatch.id },
        data: { status: "PLANNED", readyAt: null },
      });
      await writeAudit({
        actorUserId: input.actorUserId,
        action: "delivery_batch_unready",
        entityType: "DeliveryBatch",
        entityId: allocation.deliveryBatch.id,
        after: { packedQty: input.packedQty, status: "PLANNED" },
      });
    }
  }

  await recalcProductionBatch(allocation.productionBatchId);
  return updated;
}

export async function startDelivery(deliveryBatchId: string, actorUserId: string) {
  const db = await prisma.deliveryBatch.findUnique({ where: { id: deliveryBatchId } });
  if (!db) throw new HttpError(404, "Delivery batch tidak ditemukan.");
  if (db.status !== "READY") {
    throw new HttpError(409, "Delivery batch harus READY sebelum diberangkatkan.");
  }
  const now = new Date();
  const updated = await prisma.deliveryBatch.update({
    where: { id: deliveryBatchId },
    data: { status: "IN_DELIVERY", departedAt: now },
  });
  await writeAudit({
    actorUserId,
    action: "delivery_started",
    entityType: "DeliveryBatch",
    entityId: deliveryBatchId,
    before: db,
    after: updated,
  });
  const allocation = await prisma.schoolAllocation.findUnique({
    where: { id: db.allocationId },
  });
  if (allocation) await recalcProductionBatch(allocation.productionBatchId);
  return updated;
}

export async function receiveDelivery(deliveryBatchId: string, actorUserId: string) {
  const db = await prisma.deliveryBatch.findUnique({ where: { id: deliveryBatchId } });
  if (!db) throw new HttpError(404, "Delivery batch tidak ditemukan.");
  if (db.status !== "IN_DELIVERY") {
    throw new HttpError(409, "Hanya pengiriman IN_DELIVERY yang dapat diterima sekolah.");
  }
  const now = new Date();
  const updated = await prisma.deliveryBatch.update({
    where: { id: deliveryBatchId },
    data: { status: "RECEIVED", receivedAt: now },
  });
  await writeAudit({
    actorUserId,
    action: "delivery_received",
    entityType: "DeliveryBatch",
    entityId: deliveryBatchId,
    before: db,
    after: updated,
  });
  const allocation = await prisma.schoolAllocation.findUnique({
    where: { id: db.allocationId },
  });
  if (allocation) await recalcProductionBatch(allocation.productionBatchId);
  return updated;
}
