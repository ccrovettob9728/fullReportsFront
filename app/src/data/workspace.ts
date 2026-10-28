"use client";

import { useEffect, useState } from "react";
import { initialProjectTasks, type ProjectTask } from "./tasks";
import { initialProjects, PROJECTS_STORAGE_KEY, SELECTED_PROJECT_STORAGE_KEY } from "./projects";
import type { Project } from "../types/project";
import { finishAppLoading, startAppLoading } from "../lib/app-loading";

export const TASKS_STORAGE_KEY = "fullreports-tasks";
export const ATTENDANCE_STORAGE_KEY = "fullreports-attendance";

export function selectWorkspaceProject(projectId: number) {
  window.localStorage.setItem(SELECTED_PROJECT_STORAGE_KEY, String(projectId));
  window.dispatchEvent(new CustomEvent("fullreports-project-selected", { detail: projectId }));
}

export type AttendanceRecord = {
  id: string;
  projectId?: number;
  employeeId: string;
  name: string;
  date: string;
  status: string;
  hours: number;
  source: string;
  importedAt: string;
};

function readTasks(): ProjectTask[] {
  try {
    const stored = window.localStorage.getItem(TASKS_STORAGE_KEY);
    if (!stored) return initialProjectTasks;
    return (JSON.parse(stored) as ProjectTask[]).map((task) => ({
      ...task,
      projectId: task.projectId ?? initialProjects[0].id,
      budgetedManHours: task.budgetedManHours ?? 0,
      taskType: task.taskType ?? "scheduled",
      activityLog: task.activityLog ?? [],
    }));
  } catch {
    return initialProjectTasks;
  }
}

export function useProjectTasks() {
  const [tasks, setTasks] = useState<ProjectTask[]>(initialProjectTasks);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjects[0].id);
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState("");

  useEffect(() => {
    let active = true;
    const loadWorkspace = async () => {
      const localTasks = readTasks();
      let localProjects = initialProjects;
      try {
        const storedProjects = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
        if (storedProjects) localProjects = JSON.parse(storedProjects) as Project[];
      } catch {
        localProjects = initialProjects;
      }
      const storedProjectId = Number(window.localStorage.getItem(SELECTED_PROJECT_STORAGE_KEY));
      setTasks(localTasks);
      setProjects(localProjects);
      if (storedProjectId) setSelectedProjectId(storedProjectId);
      setReady(true);

      try {
        const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
        if (!sessionResponse.ok) throw new Error("No se pudo consultar la sesión.");
        const session = await sessionResponse.json() as { user?: { role?: string } | null };
        const currentRole = session.user?.role ?? "";
        if (!active) return;
        setRole(currentRole);
        if (!currentRole) return;

        const projectResponse = await fetch("/api/workforce/projects", { cache: "no-store" });
        const projectData = await projectResponse.json() as { projects?: Array<Project & { assignedWorkers?: unknown[] }>; error?: string };
        if (!projectResponse.ok) throw new Error(projectData.error || "No se pudieron cargar las obras compartidas.");
        const sharedProjects = projectData.projects ?? [];
        if (currentRole === "trabajador") {
          setProjects(sharedProjects);
          setSelectedProjectId(sharedProjects[0]?.id ?? 0);
          if (!sharedProjects[0]) {
            setTasks([]);
            return;
          }
          const taskResponse = await fetch(`/api/workforce/projects/${sharedProjects[0].id}/tasks`, { cache: "no-store" });
          const taskData = await taskResponse.json() as { tasks?: ProjectTask[]; error?: string };
          if (!taskResponse.ok) throw new Error(taskData.error || "No se pudieron cargar las actividades.");
          if (active) setTasks(taskData.tasks ?? []);
          return;
        }

        if (sharedProjects.length > 0) setProjects(sharedProjects);
        const canPersist = currentRole === "admin" || currentRole === "superadmin" || currentRole === "supervisor";
        const tasksByProject = await Promise.all(sharedProjects.map(async (project) => {
          const response = await fetch(`/api/workforce/projects/${project.id}/tasks`, { cache: "no-store" });
          const data = await response.json() as { tasks?: ProjectTask[]; error?: string };
          if (!response.ok) throw new Error(data.error || `No se pudieron cargar las actividades de ${project.name}.`);
          let remoteTasks = data.tasks ?? [];
          const localProjectTasks = localTasks.filter((task) => task.projectId === project.id);
          if (!remoteTasks.length && localProjectTasks.length && canPersist) {
            const saveResponse = await fetch(`/api/workforce/projects/${project.id}/tasks`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tasks: localProjectTasks }),
            });
            const saveData = await saveResponse.json() as { error?: string };
            if (!saveResponse.ok) throw new Error(saveData.error || `No se pudieron guardar las actividades de ${project.name}.`);
            remoteTasks = localProjectTasks;
          }
          return { projectId: project.id, tasks: remoteTasks, localTasks: localProjectTasks };
        }));
        if (!active) return;
        let mergedTasks = localTasks;
        for (const result of tasksByProject) {
          if (!result.tasks.length) continue;
          const localById = new Map(result.localTasks.map((task) => [task.id, task]));
          const mergedProjectTasks = result.tasks.map((task) => ({
            ...localById.get(task.id),
            ...task,
          }));
          mergedTasks = [
            ...mergedTasks.filter((task) => task.projectId !== result.projectId),
            ...mergedProjectTasks,
          ];
        }
        setTasks(mergedTasks);
        window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(mergedTasks));
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo sincronizar el espacio de trabajo.";
        window.dispatchEvent(new CustomEvent("fullreports-data-error", { detail: message }));
      }
    };
    const loadTimeout = window.setTimeout(() => { void loadWorkspace(); }, 0);
    const syncTasks = () => setTasks(readTasks());
    const syncProjects = () => {
      try {
        const storedProjects = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
        if (storedProjects) setProjects(JSON.parse(storedProjects) as Project[]);
      } catch {
        setProjects(initialProjects);
      }
    };
    const syncProject = (event: Event) => {
      setSelectedProjectId((event as CustomEvent<number>).detail);
    };
    window.addEventListener("storage", syncTasks);
    window.addEventListener("fullreports-tasks-updated", syncTasks);
    window.addEventListener("fullreports-projects-updated", syncProjects);
    window.addEventListener("fullreports-project-selected", syncProject);
    return () => {
      window.clearTimeout(loadTimeout);
      active = false;
      window.removeEventListener("storage", syncTasks);
      window.removeEventListener("fullreports-tasks-updated", syncTasks);
      window.removeEventListener("fullreports-projects-updated", syncProjects);
      window.removeEventListener("fullreports-project-selected", syncProject);
    };
  }, []);

  const saveTasks = async (nextTasks: ProjectTask[]) => {
    setTasks(nextTasks);
    window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(nextTasks));
    window.dispatchEvent(new Event("fullreports-tasks-updated"));
    if (role !== "admin" && role !== "superadmin" && role !== "supervisor") return;
    startAppLoading();
    try {
      for (const project of projects) {
        const projectTasks = nextTasks.filter((task) => task.projectId === project.id);
        const response = await fetch(`/api/workforce/projects/${project.id}/tasks`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tasks: projectTasks }),
        });
        const data = await response.json() as { error?: string };
        if (!response.ok) {
          const message = data.error || `No se pudieron guardar las actividades de ${project.name}.`;
          window.dispatchEvent(new CustomEvent("fullreports-data-error", { detail: message }));
          throw new Error(message);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        window.dispatchEvent(new CustomEvent("fullreports-data-error", { detail: error.message }));
      }
      throw error;
    } finally {
      finishAppLoading();
    }
  };

  return { tasks, projects, selectedProjectId, ready, saveTasks };
}

export function readAttendance(): AttendanceRecord[] {
  try {
    return JSON.parse(window.localStorage.getItem(ATTENDANCE_STORAGE_KEY) ?? "[]") as AttendanceRecord[];
  } catch {
    return [];
  }
}

export function saveAttendance(records: AttendanceRecord[]) {
  window.localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(records));
}