import { NextRequest, NextResponse } from "next/server";
import {
  roleCanAccessPath,
  SESSION_COOKIE,
  verifySessionToken,
} from "@/app/src/lib/auth";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === "/api/dev-login") {
    return NextResponse.next();
  }

  const devLoginMode = request.cookies.get("fullreports-dev-login")?.value;

  if (process.env.NODE_ENV === "development" && devLoginMode === "off") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySessionToken(token) : null;

  if (!user) {
    if (pathname === "/login") return NextResponse.next();
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnTo", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login") return NextResponse.redirect(new URL("/obras", request.url));
  if (!roleCanAccessPath(user.role, pathname)) {
    return NextResponse.redirect(new URL("/sin-acceso", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|api/dev-login|_next/static|_next/image|favicon.ico|logo.png|.*\\..*).*)"],
};