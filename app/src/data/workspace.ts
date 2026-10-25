"use client";

import { useEffect, useState } from "react";
import { initialProjectTasks, type ProjectTask } from "./tasks";
import { initialProjects, PROJECTS_STORAGE_KEY, SELECTED_PROJECT_STORAGE_KEY } from "./projects";
import type { Project } from "../types/project";

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

  useEffect(() => {
    const loadWorkspace = () => {
      setTasks(readTasks());
      try {
        const storedProjects = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
        if (storedProjects) setProjects(JSON.parse(storedProjects) as Project[]);
      } catch {
        setProjects(initialProjects);
      }
      const storedProjectId = Number(window.localStorage.getItem(SELECTED_PROJECT_STORAGE_KEY));
      if (storedProjectId) setSelectedProjectId(storedProjectId);
      setReady(true);
    };
    const loadTimeout = window.setTimeout(loadWorkspace, 0);
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
      window.removeEventListener("storage", syncTasks);
      window.removeEventListener("fullreports-tasks-updated", syncTasks);
      window.removeEventListener("fullreports-projects-updated", syncProjects);
      window.removeEventListener("fullreports-project-selected", syncProject);
    };
  }, []);

  const saveTasks = (nextTasks: ProjectTask[]) => {
    setTasks(nextTasks);
    window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(nextTasks));
    window.dispatchEvent(new Event("fullreports-tasks-updated"));
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