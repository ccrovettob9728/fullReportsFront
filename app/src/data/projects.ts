import type { Project } from "../types/project";

export const PROJECTS_STORAGE_KEY = "fullreports-projects";
export const SELECTED_PROJECT_STORAGE_KEY = "fullreports-selected-project";

export const initialProjects: Project[] = [
  {
    id: 1,
    name: "Proyecto Condominio La Serena",
    description: "Construcción y seguimiento general de la obra.",
    status: "active",
  },
  {
    id: 2,
    name: "Edificio Parque Norte",
    description: "Proyecto residencial en etapa de planificación.",
    status: "active",
  },
  {
    id: 3,
    name: "Remodelación Centro",
    description: "Remodelación integral de espacios interiores.",
    status: "paused",
  },
];
