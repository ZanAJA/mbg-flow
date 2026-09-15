import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/shared/auth/session";
import { canAccessPath } from "@/shared/auth/rbac";

const PUBLIC_PREFIXES = ["/login", "/q/", "/api/auth/login", "/api/public/"];

function isPublic(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySessionToken(token) : null;

  if (pathname.startsWith("/api/public/")) return NextResponse.next();
  if (pathname === "/api/auth/login") return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    if (!user) {
      return NextResponse.json({ error: "Anda perlu masuk terlebih dahulu." }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (isPublic(pathname)) {
    if (user && (pathname === "/login" || pathname === "/")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (!canAccessPath(user.role, pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const proxyConfig = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
