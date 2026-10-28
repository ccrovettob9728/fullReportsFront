import { NextRequest, NextResponse } from "next/server";
import { getWorkforceUser, rejectCrossOriginMutation, workforceErrorResponse } from "@/app/src/lib/workforce-auth";
import { getProject, listProjectMachines, listWorkerProjects, saveProjectMachine, WorkforceStoreError } from "@/app/src/lib/workforce-store";

type RouteContext = { params: Promise<{ projectId: string }> };

async function getProjectId(context: RouteContext) {
  const { projectId } = await context.params;
  const id = Number(projectId);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new WorkforceStoreError("El identificador de obra no es válido.", 400);
  }
  return id;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getWorkforceUser(["admin", "superadmin", "supervisor", "trabajador"]);
  if (!user) return NextResponse.json({ error: "No tienes permiso para consultar la maquinaria." }, { status: 403 });
  try {
    const projectId = await getProjectId(context);
    const project = user.role === "trabajador"
      ? (await listWorkerProjects(user.sub)).find((candidate) => candidate.id === projectId)
      : await getProject(projectId);
    if (!project) return NextResponse.json({ error: "No tienes acceso a esta obra." }, { status: 403 });
    const machines = await listProjectMachines(projectId);
    return NextResponse.json({ machines }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return workforceErrorResponse(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getWorkforceUser(["admin", "superadmin"]);
  if (!user) return NextResponse.json({ error: "Se requiere el rol administrador." }, { status: 403 });
  const originError = rejectCrossOriginMutation(request);
  if (originError) return originError;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la solicitud debe ser JSON válido." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("name" in body) ||
    typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 100) {
    return NextResponse.json({ error: "Ingresa un nombre de maquinaria de hasta 100 caracteres." }, { status: 400 });
  }
  try {
    const projectId = await getProjectId(context);
    if (!(await getProject(projectId))) {
      return NextResponse.json({ error: "La obra indicada no existe." }, { status: 404 });
    }
    const machine = { id: crypto.randomUUID(), projectId, name: body.name.trim(), active: true };
    await saveProjectMachine(machine);
    return NextResponse.json({ machine });
  } catch (error) {
    return workforceErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getWorkforceUser(["admin", "superadmin"]);
  if (!user) return NextResponse.json({ error: "Se requiere el rol administrador." }, { status: 403 });
  const originError = rejectCrossOriginMutation(request);
  if (originError) return originError;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la solicitud debe ser JSON válido." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("id" in body) || !("active" in body) ||
    typeof body.id !== "string" || typeof body.active !== "boolean") {
    return NextResponse.json({ error: "Se requieren un identificador y un estado válido." }, { status: 400 });
  }
  try {
    const projectId = await getProjectId(context);
    const current = (await listProjectMachines(projectId)).find((machine) => machine.id === body.id);
    if (!current) return NextResponse.json({ error: "La maquinaria no existe en esta obra." }, { status: 404 });
    const machine = { ...current, active: body.active };
    await saveProjectMachine(machine);
    return NextResponse.json({ machine });
  } catch (error) {
    return workforceErrorResponse(error);
  }
}
