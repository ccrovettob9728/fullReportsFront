export type TaskStatus = "todo" | "in-progress" | "done";
export type ReviewStatus = "pending" | "reviewed";

export type ProjectTask = {
  id: number;
  projectId: number;
  title: string;
  description: string;
  status: TaskStatus;
  reviewStatus: ReviewStatus;
  milestoneId: string;
  milestoneName: string;
  imageUrl?: string;
  imageUrls?: string[];
  documentUrl?: string;
  documentName?: string;
  budgetedManHours?: number;
  actualManHours?: number;
  workersCount?: number;
  startedCrewSize?: number;
  supervisor?: string;
  taskType?: "scheduled" | "out-of-program";
  scheduledDate?: string;
  startedAt?: string;
  completedAt?: string;
  activityLog?: Array<{ at: string; description: string }>;
};

export const initialProjectTasks: ProjectTask[] = [
  {
    id: 1,
    projectId: 1,
    title: "Reunir documentación requerida",
    description: "Compilar certificados y planos para la presentación.",
    status: "todo",
    reviewStatus: "reviewed",
    milestoneId: "1",
    milestoneName: "Permisos municipales aprobados",
    budgetedManHours: 8,
    supervisor: "Supervisor de obra",
    taskType: "scheduled",
    imageUrl: "/logo.png",
  },
  {
    id: 2,
    projectId: 1,
    title: "Revisar antecedentes con el supervisor",
    description: "Validar que el expediente esté completo.",
    status: "in-progress",
    reviewStatus: "pending",
    milestoneId: "1",
    milestoneName: "Permisos municipales aprobados",
    budgetedManHours: 6,
    supervisor: "Supervisor de obra",
    taskType: "scheduled",
    documentUrl: "/file.svg",
    documentName: "antecedentes.svg",
  },
  {
    id: 3,
    projectId: 1,
    title: "Enviar solicitud municipal",
    description: "Solicitud enviada y registrada correctamente.",
    status: "done",
    reviewStatus: "reviewed",
    milestoneId: "1",
    milestoneName: "Permisos municipales aprobados",
    budgetedManHours: 4,
    actualManHours: 3.5,
    supervisor: "Supervisor de obra",
    taskType: "scheduled",
    imageUrl: "/logo.png",
    documentUrl: "/file.svg",
    documentName: "solicitud.svg",
  },
  {
    id: 4,
    projectId: 1,
    title: "Revisar canalizaciones eléctricas",
    description: "Comprobar recorridos y documentación técnica.",
    status: "in-progress",
    reviewStatus: "reviewed",
    milestoneId: "2",
    milestoneName: "Instalaciones eléctricas",
    budgetedManHours: 12,
    supervisor: "Supervisor de obra",
    taskType: "scheduled",
  },
  {
    id: 5,
    projectId: 1,
    title: "Validar terminaciones de fundaciones",
    description: "Registrar la inspección final del supervisor.",
    status: "done",
    reviewStatus: "reviewed",
    milestoneId: "3",
    milestoneName: "Fundaciones terminadas",
    budgetedManHours: 16,
    actualManHours: 14,
    supervisor: "Supervisor de obra",
    taskType: "scheduled",
    documentUrl: "/file.svg",
    documentName: "inspeccion.svg",
  },
];

export const taskStatusLabels: Record<TaskStatus, string> = {
  todo: "Por hacer",
  "in-progress": "En progreso",
  done: "Hecha",
};

export const taskStatusColors: Record<TaskStatus, string> = {
  todo: "#B18419",
  "in-progress": "#2F507F",
  done: "#2E9B6F",
};
