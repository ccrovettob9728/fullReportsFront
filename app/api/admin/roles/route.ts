import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/app/src/lib/auth";
import { assignUserRole, listManagedUsers, RoleManagementError, type AssignableRole } from "@/app/src/lib/cognito-roles";

async function getSuperAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySessionToken(token) : null;
  return user?.role === "superadmin" ? user : null;
}

export async function GET() {
  const user = await getSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: "Se requiere el rol superadmin." }, { status: 403 });
  }

  try {
    const users = await listManagedUsers();
    return NextResponse.json({ users }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("No se pudieron consultar los roles de Cognito.", error);
    const status = error instanceof RoleManagementError ? error.status : 502;
    const message = error instanceof RoleManagementError
      ? error.message
      : "No se pudieron consultar los roles en Cognito. Revisa la configuración y los permisos AWS.";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest) {
  const user = await getSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: "Se requiere el rol superadmin." }, { status: 403 });
  }
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Origen de solicitud no válido." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la solicitud debe ser JSON válido." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("email" in body) || !("role" in body) ||
    typeof body.email !== "string" || typeof body.role !== "string") {
    return NextResponse.json({ error: "Se requiere un correo y un rol válido." }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const role = body.role as AssignableRole;
  try {
    await assignUserRole(email, role);
    return NextResponse.json({ email, role });
  } catch (error) {
    console.error("No se pudo actualizar el rol en Cognito.", error);
    const status = error instanceof RoleManagementError ? error.status : 502;
    const message = error instanceof RoleManagementError
      ? error.message
      : "No se pudo actualizar el rol en Cognito. Revisa los permisos AWS.";
    return NextResponse.json({ error: message }, { status });
  }
}
