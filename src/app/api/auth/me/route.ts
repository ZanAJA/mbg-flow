import { handleApiError, jsonOk, requireUser } from "@/shared/lib/http";

export async function GET() {
  try {
    const user = await requireUser();
    return jsonOk(user);
  } catch (error) {
    return handleApiError(error);
  }
}
