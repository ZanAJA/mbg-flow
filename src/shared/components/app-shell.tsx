"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  CookingPot,
  LayoutDashboard,
  Leaf,
  LogOut,
  MapPinned,
  Menu,
  ScrollText,
  Truck,
  Users,
  UsersRound,
  UtensilsCrossed,
} from "lucide-react";
import { ApiError, apiFetch } from "@/shared/lib/api";
import type { Role, SessionShape } from "@/shared/components/session-types";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/components/ui/sheet";
import { cn } from "@/shared/lib/utils";
import { ROLE_LABEL } from "@/shared/auth/rbac";
import { SiteFooter } from "@/shared/components/site-footer";

const NAV: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
}> = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["SUPERVISOR", "KITCHEN", "DISTRIBUTOR"] },
  { href: "/ingredients", label: "Bahan Baku", icon: Leaf, roles: ["SUPERVISOR", "KITCHEN"] },
  { href: "/ai-menu", label: "Rekomendasi Menu", icon: UtensilsCrossed, roles: ["SUPERVISOR", "KITCHEN"] },
  { href: "/production", label: "Produksi", icon: CookingPot, roles: ["SUPERVISOR", "KITCHEN"] },
  { href: "/batches", label: "Batch", icon: ClipboardList, roles: ["SUPERVISOR", "KITCHEN", "DISTRIBUTOR"] },
  { href: "/distribution", label: "Distribusi", icon: Truck, roles: ["SUPERVISOR", "DISTRIBUTOR"] },
  { href: "/schools", label: "Sekolah", icon: MapPinned, roles: ["SUPERVISOR"] },
  { href: "/teams", label: "Tim", icon: UsersRound, roles: ["SUPERVISOR", "KITCHEN", "DISTRIBUTOR"] },
  { href: "/audit", label: "Audit", icon: ScrollText, roles: ["SUPERVISOR"] },
  { href: "/users", label: "Pengguna", icon: Users, roles: ["SUPERVISOR"] },
];

function NavLinks({
  role,
  pathname,
  onNavigate,
}: {
  role: Role;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.filter((item) => item.roles.includes(role)).map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const isPublic = pathname === "/" || pathname === "/login" || pathname.startsWith("/q/");

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<SessionShape>("/api/auth/me"),
    enabled: !isPublic,
    retry: 1,
    refetchOnMount: "always",
    staleTime: 0,
  });

  useEffect(() => {
    if (isPublic) return;
    if (me.isError && me.error instanceof ApiError && me.error.status === 401) {
      queryClient.clear();
      window.location.assign(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isPublic, me.isError, me.error, pathname, queryClient]);

  if (pathname.startsWith("/q/")) return <>{children}</>;

  if (isPublic) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <main className="min-w-0 flex-1">{children}</main>
        <SiteFooter />
      </div>
    );
  }

  const user = me.data?.data;

  async function confirmLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      queryClient.clear();
      setLogoutOpen(false);
      // Full navigation so proxy + cookie state are not stuck on soft client routing.
      window.location.assign("/login");
    } catch {
      setLoggingOut(false);
    }
  }

  const logoutButton = (
    <Button
      variant="ghost"
      className="mt-2 w-full justify-start text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      onClick={() => setLogoutOpen(true)}
    >
      <LogOut className="size-4" />
      Keluar
    </Button>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-sidebar p-4 md:flex md:flex-col">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex size-9 items-center justify-center rounded-lg border text-primary-foreground">
            <Image src="/logo-mbgflow.png" alt="Logo MBG Flow" width={24} height={24} />
          </div>
          <div>
            <p className="text-sm font-semibold">MBG Flow</p>
            <p className="text-xs text-muted-foreground">SPPG Cilandak</p>
          </div>
        </div>
        {user ? <NavLinks role={user.role} pathname={pathname} /> : null}
        <div className="mt-auto border-t pt-4">
          {user ? (
            <>
              <p className="px-2 text-sm font-medium">{user.name}</p>
              <p className="px-2 text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</p>
              {logoutButton}
            </>
          ) : null}
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col md:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur md:hidden">
          <div>
            <p className="text-sm font-semibold">MBG Flow</p>
            <p className="text-xs text-muted-foreground">{user ? ROLE_LABEL[user.role] : "Memuat"}</p>
          </div>
          <Sheet>
            <SheetTrigger render={<Button variant="outline" size="icon" />}>
              <Menu className="size-4" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>Navigasi MBG</SheetTitle>
              </SheetHeader>
              {user ? (
                <div className="px-2">
                  <NavLinks role={user.role} pathname={pathname} />
                  <Button
                    variant="ghost"
                    className="mt-4 w-full justify-start text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setLogoutOpen(true)}
                  >
                    <LogOut className="size-4" />
                    Keluar
                  </Button>
                </div>
              ) : null}
            </SheetContent>
          </Sheet>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
        <SiteFooter />
      </div>

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Keluar dari akun?</DialogTitle>
            <DialogDescription>
              Sesi Anda akan diakhiri. Masuk kembali untuk melanjutkan kerja di MBG Flow.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutOpen(false)} disabled={loggingOut}>
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmLogout} disabled={loggingOut}>
              {loggingOut ? "Keluar..." : "Ya, keluar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
