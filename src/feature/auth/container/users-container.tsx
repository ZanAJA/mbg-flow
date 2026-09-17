"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/api";
import { PageHeader, QueryState } from "@/shared/components/page-header";
import { Badge } from "@/shared/components/ui/badge";
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
      <PageHeader title="Pengguna SPPG" />
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(query.data?.data ?? []).map((user) => (
            <Card key={user.id} className="py-0">
              <CardContent className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate font-medium leading-snug">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {ROLE_LABEL[user.role]} · {user.sppg.name}
                  </p>
                </div>
                <Badge variant={user.active ? "secondary" : "outline"} className="shrink-0">
                  {user.active ? "Aktif" : "Nonaktif"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </QueryState>
    </div>
  );
}
