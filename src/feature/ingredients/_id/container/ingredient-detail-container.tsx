"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api";
import { PageHeader, QueryState } from "@/shared/components/page-header";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { formatDate, formatDateTime, daysUntil } from "@/shared/lib/format";

type IngredientDetail = {
  id: string;
  name: string;
  category: string;
  unit: string;
  lots: Array<{
    id: string;
    lotCode: string;
    quantity: number;
    expiryDate: string;
    receivedAt: string;
    storageType: string;
    supplier: string;
    status: string;
  }>;
};

export function IngredientDetailContainer() {
  const params = useParams<{ id: string }>();
  const query = useQuery({
    queryKey: ["ingredient", params.id],
    queryFn: () => apiFetch<IngredientDetail>(`/api/ingredients/${params.id}`),
  });
  const data = query.data?.data;

  return (
    <div>
      <PageHeader
        title={data?.name ?? "Detail bahan"}
        description={data ? `${data.category} · satuan ${data.unit}` : "Memuat lot dan expiry."}
      />
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()}>
        {data ? (
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode lot</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Diterima</TableHead>
                    <TableHead>Penyimpanan</TableHead>
                    <TableHead>Pemasok</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lots.map((lot) => (
                    <TableRow key={lot.id}>
                      <TableCell>{lot.lotCode}</TableCell>
                      <TableCell>
                        {lot.quantity} {data.unit}
                      </TableCell>
                      <TableCell>
                        {formatDate(lot.expiryDate)} ({daysUntil(lot.expiryDate)} hari)
                      </TableCell>
                      <TableCell>{formatDateTime(lot.receivedAt)}</TableCell>
                      <TableCell>{lot.storageType}</TableCell>
                      <TableCell>{lot.supplier}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}
      </QueryState>
    </div>
  );
}
