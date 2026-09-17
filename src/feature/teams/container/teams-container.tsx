"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Copy, UsersRound } from "lucide-react";
import { apiFetch } from "@/shared/lib/api";
import { PageHeader, QueryState, EmptyState } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { ROLE_LABEL } from "@/shared/auth/rbac";
import type { Role } from "@/shared/types/enums";

type Team = {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: { id: string; name: string; role: Role };
  members: Array<{
    id: string;
    joinedAt: string;
    user: { id: string; name: string; email: string; role: Role };
  }>;
};

type SessionMe = { id: string; role: Role; name: string };

const createSchema = z.object({ name: z.string().trim().min(2, "Nama tim terlalu pendek") });
const joinSchema = z.object({ inviteCode: z.string().trim().min(4, "Kode undangan tidak valid") });

export function TeamsContainer() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<SessionMe>("/api/auth/me"),
  });
  const teams = useQuery({
    queryKey: ["teams"],
    queryFn: () => apiFetch<Team[]>("/api/teams"),
  });

  const createForm = useForm({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "" },
  });
  const joinForm = useForm({
    resolver: zodResolver(joinSchema),
    defaultValues: { inviteCode: "" },
  });

  const role = me.data?.data?.role;
  const isSupervisor = role === "SUPERVISOR";

  const createTeam = useMutation({
    mutationFn: (values: z.infer<typeof createSchema>) =>
      apiFetch("/api/teams", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      toast.success("Tim dibuat. Bagikan kode undangan ke dapur & distributor.");
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setCreateOpen(false);
      createForm.reset();
    },
    onError: (error) => toast.error(error.message),
  });

  const joinTeam = useMutation({
    mutationFn: (values: z.infer<typeof joinSchema>) =>
      apiFetch("/api/teams/join", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      toast.success("Berhasil bergabung ke tim.");
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      joinForm.reset();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteTeam = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/teams/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Tim dihapus.");
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const rows = teams.data?.data ?? [];

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Kode undangan disalin");
    } catch {
      toast.error("Gagal menyalin kode");
    }
  }

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader
        title="Tim operasional"
        action={
          isSupervisor ? (
            <Button onClick={() => setCreateOpen(true)}>Buat tim</Button>
          ) : undefined
        }
      />

      {!isSupervisor ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gabung tim</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={joinForm.handleSubmit((values) => joinTeam.mutate(values))}
            >
              <div className="min-w-0 flex-1 space-y-1">
                <Label htmlFor="invite-code">Kode undangan</Label>
                <Input
                  id="invite-code"
                  placeholder="Contoh: A1B2C3"
                  className="uppercase"
                  {...joinForm.register("inviteCode")}
                />
              </div>
              <Button type="submit" disabled={joinTeam.isPending}>
                Gabung
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <QueryState isLoading={teams.isLoading} error={teams.error} onRetry={() => teams.refetch()}>
        {rows.length === 0 ? (
          <EmptyState
            title="Belum ada tim"
            description={
              isSupervisor
                ? "Buat tim agar dapur dan distributor bisa bergabung dengan kode undangan."
                : "Minta kode undangan dari supervisor, lalu gabung di form di atas."
            }
            actionLabel={isSupervisor ? "Buat tim" : undefined}
            onAction={isSupervisor ? () => setCreateOpen(true) : undefined}
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {rows.map((team) => (
              <Card key={team.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="truncate text-base">{team.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Dibuat {team.createdBy.name} · {team.members.length} anggota
                    </p>
                  </div>
                  <UsersRound className="size-4 shrink-0 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="font-mono tracking-wider">
                      {team.inviteCode}
                    </Badge>
                    <Button type="button" size="sm" variant="ghost" onClick={() => copyCode(team.inviteCode)}>
                      <Copy className="size-3.5" />
                      Salin
                    </Button>
                    {isSupervisor ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        disabled={deleteTeam.isPending}
                        onClick={() => {
                          if (confirm(`Hapus tim "${team.name}"?`)) deleteTeam.mutate(team.id);
                        }}
                      >
                        Hapus
                      </Button>
                    ) : null}
                  </div>
                  <ul className="space-y-2">
                    {team.members.map((member) => (
                      <li key={member.id} className="flex items-center justify-between gap-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{member.user.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {ROLE_LABEL[member.user.role]}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </QueryState>

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md bg-background">
            <CardHeader>
              <CardTitle>Buat tim baru</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={createForm.handleSubmit((values) => createTeam.mutate(values))}
              >
                <div className="space-y-1">
                  <Label htmlFor="team-name">Nama tim</Label>
                  <Input id="team-name" placeholder="Tim Pagi Cilandak" {...createForm.register("name")} />
                  {createForm.formState.errors.name ? (
                    <p className="text-xs text-destructive">{createForm.formState.errors.name.message}</p>
                  ) : null}
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={createTeam.isPending}>
                    Simpan
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
