import { NextRequest, NextResponse } from "next/server";
import type { ProjectTask } from "@/app/src/data/tasks";
import { getWorkforceUser, rejectCrossOriginMutation, workforceErrorResponse } from "@/app/src/lib/workforce-auth";
import { getProject, listProjectTasks, listWorkerProjects, replaceProjectTasks, WorkforceStoreError } from "@/app/src/lib/workforce-store";

type RouteContext = { params: Promise<{ projectId: string }> };

function isValidTask(value: unknown, projectId: number): value is ProjectTask {
  if (!value || typeof value !== "object") return false;
  const task = value as Partial<ProjectTask>;
  return Number.isSafeInteger(task.id) &&
    task.projectId === projectId &&
    typeof task.title === "string" &&
    task.title.trim().length > 0 &&
    task.title.length <= 200 &&
    typeof task.description === "string" &&
    task.description.length <= 4000 &&
    ["todo", "in-progress", "done"].includes(String(task.status)) &&
    ["pending", "reviewed"].includes(String(task.reviewStatus)) &&
    typeof task.milestoneId === "string" &&
    typeof task.milestoneName === "string" &&
    (task.budgetedManHours === undefined ||
      (typeof task.budgetedManHours === "number" && Number.isFinite(task.budgetedManHours) && task.budgetedManHours >= 0)) &&
    (task.taskType === undefined || task.taskType === "scheduled" || task.taskType === "out-of-program") &&
    (task.scheduledDate === undefined || typeof task.scheduledDate === "string");
}

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
  if (!user) return NextResponse.json({ error: "No tienes permiso para consultar las actividades." }, { status: 403 });
  try {
    const projectId = await getProjectId(context);
    const project = user.role === "trabajador"
      ? (await listWorkerProjects(user.sub)).find((candidate) => candidate.id === projectId)
      : await getProject(projectId);
    if (!project) return NextResponse.json({ error: "No tienes acceso a esta obra." }, { status: 403 });
    return NextResponse.json({ tasks: await listProjectTasks(projectId) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return workforceErrorResponse(error);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const user = await getWorkforceUser(["admin", "superadmin", "supervisor"]);
  if (!user) return NextResponse.json({ error: "Se requiere el rol administrador." }, { status: 403 });
  const originError = rejectCrossOriginMutation(request);
  if (originError) return originError;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la solicitud debe ser JSON válido." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("tasks" in body) || !Array.isArray(body.tasks)) {
    return NextResponse.json({ error: "Se requiere una lista de actividades válida." }, { status: 400 });
  }
  try {
    const projectId = await getProjectId(context);
    if (!(await getProject(projectId))) {
      return NextResponse.json({ error: "La obra indicada no existe." }, { status: 404 });
    }
    const rawTasks: unknown[] = body.tasks;
    if (rawTasks.length > 2000 || rawTasks.some((task) => !isValidTask(task, projectId)) ||
      new Set(rawTasks.map((task) => (task as ProjectTask).id)).size !== rawTasks.length) {
      return NextResponse.json({ error: "La lista contiene actividades inválidas o duplicadas." }, { status: 400 });
    }
    const tasks = rawTasks as ProjectTask[];
    await replaceProjectTasks(projectId, tasks);
    return NextResponse.json({ saved: tasks.length });
  } catch (error) {
    return workforceErrorResponse(error);
  }
}
