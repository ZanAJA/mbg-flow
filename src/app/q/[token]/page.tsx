import { PublicQrContainer } from "@/feature/public-qr/container/public-qr-container";
import { getPublicQrByToken } from "@/feature/public-qr/data/get-public-qr";

export default async function PublicQrPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const initialData = await getPublicQrByToken(token);
  const serverNow = new Date().toISOString();

  return (
    <PublicQrContainer
      token={token}
      initialData={initialData}
      initialServerNow={serverNow}
      initialError={initialData ? null : "Token QR tidak valid."}
    />
  );
}
