import type { ProjectTask } from "../data/tasks";
import type { ProjectMachine, ShiftRecord, WorkerActivity, WorkforceProject } from "../types/workforce";

export type WorkerWorkspace = {
  project: WorkforceProject | null;
  tasks: ProjectTask[];
  machines: ProjectMachine[];
  activeShift: Pick<ShiftRecord, "id" | "projectId" | "workerEmail" | "workerName" | "startedAt"> | null;
  activeActivity: Pick<WorkerActivity, "id" | "projectId" | "taskId" | "taskTitle" | "machineId" | "machineName" | "comment" | "startedAt"> | null;
  shifts: ShiftRecord[];
  activities: WorkerActivity[];
};

export async function workforceRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers,
  });
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "No se pudo completar la solicitud.");
  }
  return payload;
}

export function fetchWorkerWorkspace() {
  return workforceRequest<WorkerWorkspace>("/api/worker/workspace");
}
