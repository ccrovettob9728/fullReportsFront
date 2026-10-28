import { NextRequest, NextResponse } from "next/server";
import { getWorkforceUser, workforceErrorResponse } from "@/app/src/lib/workforce-auth";
import { getProject, listProjectWorkerActivities, WorkforceStoreError } from "@/app/src/lib/workforce-store";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getWorkforceUser(["admin", "superadmin", "supervisor"]);
  if (!user) return NextResponse.json({ error: "No tienes permiso para consultar el historial." }, { status: 403 });
  const { projectId: rawProjectId } = await context.params;
  const projectId = Number(rawProjectId);
  if (!Number.isSafeInteger(projectId) || projectId < 1) {
    return NextResponse.json({ error: "El identificador de obra no es válido." }, { status: 400 });
  }
  try {
    if (!(await getProject(projectId))) {
      throw new WorkforceStoreError("La obra indicada no existe.", 404);
    }
    const activities = await listProjectWorkerActivities(projectId);
    return NextResponse.json({ activities }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return workforceErrorResponse(error);
  }
}
