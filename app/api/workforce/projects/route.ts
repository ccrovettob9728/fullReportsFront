import { NextRequest, NextResponse } from "next/server";
import { listManagedUsers } from "@/app/src/lib/cognito-roles";
import { getWorkforceUser, isProjectManager, rejectCrossOriginMutation, workforceErrorResponse } from "@/app/src/lib/workforce-auth";
import { deleteEmptyProject, getProject, listProjects, listWorkerProjects, saveProject, WorkforceStoreError, type AssignedWorker } from "@/app/src/lib/workforce-store";
import type { Project } from "@/app/src/types/project";

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function GET(request: NextRequest) {
  const user = await getWorkforceUser(["admin", "superadmin", "supervisor", "trabajador"]);
  if (!user) return NextResponse.json({ error: "No tienes permiso para consultar las obras." }, { status: 403 });

  try {
    const projects = user.role === "trabajador"
      ? (await listWorkerProjects(user.sub)).map((project) => ({ ...project, assignedWorkers: [] }))
      : await listProjects();
    const workers = isProjectManager(user) && request.nextUrl.searchParams.get("includeWorkers") === "1"
      ? (await listManagedUsers()).filter((candidate) => candidate.role === "trabajador" && candidate.sub)
      : undefined;
    return NextResponse.json({ projects, workers }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return workforceErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
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
  if (!body || typeof body !== "object" || !("project" in body) || !("workerSubs" in body)) {
    return NextResponse.json({ error: "Se requieren los datos de la obra y sus trabajadores." }, { status: 400 });
  }
  const candidate = body.project as Partial<Project> | null;
  const workerSubs = body.workerSubs;
  const preserveExisting = "preserveExisting" in body && body.preserveExisting === true;
  if (!candidate || !Number.isSafeInteger(candidate.id) || Number(candidate.id) < 1 ||
    typeof candidate.name !== "string" || !candidate.name.trim() || candidate.name.length > 120 ||
    typeof candidate.description !== "string" || candidate.description.length > 2000 ||
    !["active", "paused", "completed"].includes(String(candidate.status)) ||
    !Array.isArray(workerSubs) || workerSubs.some((sub) => typeof sub !== "string")) {
    return NextResponse.json({ error: "Los datos de la obra o la lista de trabajadores no son válidos." }, { status: 400 });
  }
  if (new Set(workerSubs).size !== workerSubs.length) {
    return NextResponse.json({ error: "No repitas trabajadores en la asignación." }, { status: 400 });
  }
  if (workerSubs.length > 40) {
    return NextResponse.json({ error: "Una obra no puede tener más de 40 trabajadores asignados." }, { status: 400 });
  }
  if (candidate.startDate !== undefined && (typeof candidate.startDate !== "string" || !isCalendarDate(candidate.startDate))) {
    return NextResponse.json({ error: "La fecha de inicio no es válida." }, { status: 400 });
  }
  if (candidate.plannedEndDate !== undefined && (typeof candidate.plannedEndDate !== "string" || !isCalendarDate(candidate.plannedEndDate) ||
    (candidate.startDate && candidate.plannedEndDate < candidate.startDate))) {
    return NextResponse.json({ error: "La fecha presupuestada de término no es válida." }, { status: 400 });
  }

  try {
    const project: Project = {
      id: Number(candidate.id),
      name: candidate.name.trim(),
      description: candidate.description.trim(),
      status: candidate.status as Project["status"],
      startDate: candidate.startDate,
      plannedEndDate: candidate.plannedEndDate,
    };
    if (preserveExisting) {
      if (workerSubs.length) {
        return NextResponse.json({ error: "La migración inicial no puede asignar trabajadores." }, { status: 400 });
      }
      const existing = await getProject(project.id);
      if (existing) return NextResponse.json({ project: existing });
    }
    const managedWorkers = workerSubs.length
      ? (await listManagedUsers()).filter((candidateUser) =>
        candidateUser.role === "trabajador" && candidateUser.sub && workerSubs.includes(candidateUser.sub),
      )
      : [];
    if (managedWorkers.length !== workerSubs.length) {
      throw new WorkforceStoreError("Solo se pueden asignar cuentas Cognito con rol trabajador.", 400);
    }
    const assignedWorkers: AssignedWorker[] = managedWorkers.flatMap(({ sub, email, name }) =>
      sub ? [{ sub, email, name }] : [],
    );
    await saveProject(project, assignedWorkers);
    const savedProject = await getProject(project.id);
    if (!savedProject) throw new WorkforceStoreError("La obra no quedó disponible después de guardarla.", 502);
    return NextResponse.json({ project: savedProject });
  } catch (error) {
    return workforceErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getWorkforceUser(["admin", "superadmin"]);
  if (!user) return NextResponse.json({ error: "Se requiere el rol administrador." }, { status: 403 });
  const originError = rejectCrossOriginMutation(request);
  if (originError) return originError;
  const projectId = Number(request.nextUrl.searchParams.get("id"));
  if (!Number.isSafeInteger(projectId) || projectId < 1) {
    return NextResponse.json({ error: "El identificador de obra no es válido." }, { status: 400 });
  }
  try {
    await deleteEmptyProject(projectId);
    return NextResponse.json({ deleted: projectId });
  } catch (error) {
    return workforceErrorResponse(error);
  }
}
