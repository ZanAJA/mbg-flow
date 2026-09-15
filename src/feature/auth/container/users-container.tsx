"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api";
import { PageHeader, QueryState } from "@/shared/components/page-header";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ROLE_LABEL } from "@/shared/auth/rbac";
import type { Role } from "@/shared/types/enums";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  sppg: { name: string };
};

export function UsersContainer() {
  const query = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<UserRow[]>("/api/users"),
  });

  return (
    <div>
      <PageHeader
        title="Pengguna SPPG"
        description="Manajemen pengguna lengkap adalah P1. Halaman ini menampilkan akun operasional yang sudah di-seed."
      />
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()}>
        <div className="grid gap-3 md:grid-cols-2">
          {(query.data?.data ?? []).map((user) => (
            <Card key={user.id}>
              <CardContent className="pt-4">
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <p className="text-sm">{ROLE_LABEL[user.role]} · {user.sppg.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </QueryState>
    </div>
  );
}
