import type { Project } from "./project";

export type AssignedWorker = {
  sub: string;
  email: string;
  name: string;
};

export type WorkforceProject = Project & {
  assignedWorkers: AssignedWorker[];
  workforceUsed: boolean;
};

export type ProjectMachine = {
  id: string;
  projectId: number;
  name: string;
  active: boolean;
};

export type ShiftRecord = {
  id: string;
  projectId: number;
  workerEmail: string;
  workerName: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
};

export type WorkerActivity = {
  id: string;
  projectId: number;
  taskId: number;
  taskTitle: string;
  workerEmail: string;
  workerName: string;
  machineId: string | null;
  machineName: string | null;
  comment: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
};
