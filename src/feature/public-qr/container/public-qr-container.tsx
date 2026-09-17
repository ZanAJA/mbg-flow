"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api";
import { Countdown } from "@/shared/components/countdown";
import { DeliveryBadge, SafetyBadge } from "@/shared/components/status-badges";
import { Card, CardContent } from "@/shared/components/ui/card";
import { formatDateTime } from "@/shared/lib/format";

type Payload = {
  menuName: string;
  sppgName: string;
  schoolName: string;
  portionQty: number;
  productionCode: string;
  deliveryCode: string;
  safeUntil: string | null;
  receivedAt: string | null;
  productionStatus: string;
  deliveryStatus: string;
  safetyStatus: string;
};

export function PublicQrContainer() {
  const params = useParams<{ token: string }>();
  const query = useQuery({
    queryKey: ["public-qr", params.token],
    queryFn: () => apiFetch<Payload>(`/api/public/q/${params.token}`),
    refetchInterval: 5_000,
  });
  const data = query.data?.data;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#d7efe0,_#f7f4ea_40%)] px-4 py-10">
      <Card className="mx-auto max-w-lg">
        <CardContent className="space-y-4 pt-6">
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">MBG Publik</p>
          {query.isLoading ? <p className="text-sm text-muted-foreground">Memuat status batch...</p> : null}
          {query.error ? (
            <div>
              <p className="font-medium text-destructive">QR tidak valid</p>
              <p className="text-sm text-muted-foreground">{query.error.message}</p>
            </div>
          ) : null}
          {data ? (
            <>
              <h1 className="text-2xl font-semibold">{data.menuName}</h1>
              <p className="text-sm text-muted-foreground">
                {data.schoolName} · {data.portionQty} porsi
              </p>
              <div className="flex flex-wrap gap-2">
                <DeliveryBadge status={data.deliveryStatus} />
                <SafetyBadge status={data.safetyStatus} />
              </div>
              <div className="flex justify-center py-2">
                <Countdown safeUntil={data.safeUntil} serverNow={query.data!.serverNow} />
              </div>
              {data.receivedAt ? (
                <p className="text-sm text-center text-muted-foreground">
                  Diterima {formatDateTime(data.receivedAt)}
                </p>
              ) : null}
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
