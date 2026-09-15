import { getSessionUser, jsonError, jsonOk } from "@/shared/lib/http";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonError(401, "Belum masuk.");
  return jsonOk(user);
}
