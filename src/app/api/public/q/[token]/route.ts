import { getPublicQrByToken } from "@/feature/public-qr/data/get-public-qr";
import { jsonError, jsonOk } from "@/shared/lib/http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const payload = await getPublicQrByToken(token);
  if (!payload) return jsonError(404, "Token QR tidak valid.");
  return jsonOk(payload);
}
