import QRCode from "qrcode";
import { prisma } from "@/shared/db/prisma";
import { deriveSafetyStatus } from "@/shared/safety/engine";
import { handleApiError, HttpError, jsonOk, requireUser } from "@/shared/lib/http";

export async function GET(
  request: Request,
  context: { params: Promise<{ deliveryBatchId: string }> },
) {
  try {
    await requireUser(["SUPERVISOR", "KITCHEN", "DISTRIBUTOR"]);
    const { deliveryBatchId } = await context.params;
    const delivery = await prisma.deliveryBatch.findUnique({
      where: { id: deliveryBatchId },
      include: {
        allocation: {
          include: {
            school: true,
            batch: { include: { menu: true, sppg: true } },
          },
        },
      },
    });
    if (!delivery) throw new HttpError(404, "Delivery batch tidak ditemukan.");

    const configuredOrigin = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL)?.replace(
      /\/$/,
      "",
    );
    const origin = configuredOrigin || new URL(request.url).origin;
    const publicUrl = `${origin}/q/${delivery.qrToken}`;
    const qrDataUrl = await QRCode.toDataURL(publicUrl, { margin: 1, width: 280 });
    const snapshot = JSON.parse(delivery.allocation.batch.menuSnapshot) as {
      name?: string;
      durabilityNote?: string;
    };

    return jsonOk({
      publicUrl,
      qrDataUrl,
      menuName: snapshot.name ?? delivery.allocation.batch.menu.name,
      sppgName: delivery.allocation.batch.sppg.name,
      sppgAddress: delivery.allocation.batch.sppg.address,
      schoolName: delivery.allocation.school.name,
      portionQty: delivery.allocation.portionQty,
      productionCode: delivery.allocation.batch.code,
      deliveryCode: delivery.code,
      safeUntil: delivery.allocation.batch.safeUntil,
      safetyStatus: deriveSafetyStatus(delivery.allocation.batch.safeUntil, new Date()),
      durabilityNote: snapshot.durabilityNote ?? delivery.allocation.batch.menu.durabilityNote,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
