import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { homePathForRole } from "@/lib/auth/permissions";
import type { UserRole } from "@prisma/client";

const { auth } = NextAuth(authConfig);

function isProtectedPath(pathname: string) {
  return pathname.startsWith("/hq") || pathname.startsWith("/field") || pathname.startsWith("/family");
}

function withNoStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;
  const session = request.auth;
  const role = session?.user?.role as UserRole | undefined;
  const hasSession = Boolean(session?.user?.id && role);

  const isPublic =
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/signup") ||
    pathname === "/design-preview" ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/register" ||
    pathname.startsWith("/api/oauth");

  if (hasSession && (pathname === "/login" || pathname.startsWith("/signup"))) {
    return NextResponse.redirect(new URL(homePathForRole(role!), request.url));
  }

  // "/" redirect when logged in is handled by the server home page (getSession + DB check).

  if (isPublic) {
    return NextResponse.next();
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/hq") && role !== "OPERATIONS_OFFICIAL") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/field") && role !== "FIELD_PERSONNEL") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/family") && role !== "FAMILY_NOK") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isProtectedPath(pathname)) {
    return withNoStore(NextResponse.next());
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
