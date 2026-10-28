import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken, type AppRole, type AuthenticatedUser } from "./auth";

export async function getWorkforceUser(roles: AppRole[]) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySessionToken(token) : null;
  return user && roles.includes(user.role) ? user : null;
}

export function rejectCrossOriginMutation(request: NextRequest) {
  if (request.headers.get("origin") === request.nextUrl.origin) return null;
  return NextResponse.json({ error: "Origen de solicitud no válido." }, { status: 403 });
}

export function workforceErrorResponse(error: unknown) {
  if (error instanceof Error && "status" in error && typeof error.status === "number") {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("No se pudo completar la operación de trabajadores.", error);
  return NextResponse.json({ error: "No se pudo completar la operación. Revisa la configuración y los permisos AWS." }, { status: 502 });
}

export function isProjectManager(user: AuthenticatedUser) {
  return user.role === "admin" || user.role === "superadmin";
}
