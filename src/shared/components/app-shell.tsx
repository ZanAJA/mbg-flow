"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  CookingPot,
  LayoutDashboard,
  Leaf,
  LogOut,
  Menu,
  QrCode,
  ScrollText,
  Truck,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { apiFetch } from "@/shared/lib/api";
import type { Role, SessionShape } from "@/shared/components/session-types";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/components/ui/sheet";
import { cn } from "@/shared/lib/utils";
import { ROLE_LABEL } from "@/shared/auth/rbac";

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
  const router = useRouter();
  const isPublic = pathname === "/" || pathname === "/login" || pathname.startsWith("/q/");

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<SessionShape>("/api/auth/me"),
    enabled: !isPublic,
    retry: false,
  });

  if (isPublic) return <>{children}</>;

  const user = me.data?.data;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-sidebar p-4 md:flex md:flex-col">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <QrCode className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">MBG Dapur</p>
            <p className="text-xs text-muted-foreground">SPPG Cilandak</p>
          </div>
        </div>
        {user ? <NavLinks role={user.role} pathname={pathname} /> : null}
        <div className="mt-auto border-t pt-4">
          {user ? (
            <>
              <p className="px-2 text-sm font-medium">{user.name}</p>
              <p className="px-2 text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</p>
              <Button variant="ghost" className="mt-2 w-full justify-start" onClick={logout}>
                <LogOut className="size-4" />
                Keluar
              </Button>
            </>
          ) : null}
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur md:hidden">
          <div>
            <p className="text-sm font-semibold">MBG Dapur</p>
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
                  <Button variant="ghost" className="mt-4 w-full justify-start" onClick={logout}>
                    <LogOut className="size-4" />
                    Keluar
                  </Button>
                </div>
              ) : null}
            </SheetContent>
          </Sheet>
        </header>
        <main className="px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
