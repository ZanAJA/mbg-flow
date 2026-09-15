import type { Role } from "@/shared/types/enums";

const kitchenRoutes = ["/ingredients", "/ai-menu", "/menus", "/production"];
const distributorRoutes = ["/distribution"];
const supervisorOnly = ["/audit", "/users"];

export function canAccessPath(role: Role, pathname: string) {
  if (pathname.startsWith("/q/") || pathname === "/login") return true;
  if (supervisorOnly.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return role === "SUPERVISOR";
  }
  if (kitchenRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return role === "SUPERVISOR" || role === "KITCHEN";
  }
  if (distributorRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return role === "SUPERVISOR" || role === "DISTRIBUTOR";
  }
  return true;
}

export function assertRole(userRole: Role, allowed: Role[]) {
  if (!allowed.includes(userRole)) {
    const error = new Error("Forbidden") as Error & { status: number };
    error.status = 403;
    throw error;
  }
}

export const ROLE_LABEL: Record<Role, string> = {
  SUPERVISOR: "Supervisor",
  KITCHEN: "Orang Dapur",
  DISTRIBUTOR: "Distributor",
};
