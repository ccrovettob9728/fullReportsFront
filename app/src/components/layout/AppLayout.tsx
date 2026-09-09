"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Box } from "@chakra-ui/react";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import {
  initialProjects,
  PROJECTS_STORAGE_KEY,
  SELECTED_PROJECT_STORAGE_KEY,
} from "../../data/projects";
import type { Project } from "../../types/project";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjects[0].id);

  useEffect(() => {
    const syncProjects = window.setTimeout(() => {
      const storedProjects = window.localStorage.getItem(PROJECTS_STORAGE_KEY);

      if (!storedProjects) {
        window.localStorage.setItem(
          PROJECTS_STORAGE_KEY,
          JSON.stringify(initialProjects),
        );
        return;
      }

      try {
        const parsedProjects = JSON.parse(storedProjects) as Project[];
        if (parsedProjects.length > 0) {
          setProjects(parsedProjects);
          const storedSelectedId = Number(
            window.localStorage.getItem(SELECTED_PROJECT_STORAGE_KEY),
          );
          const selectedId = parsedProjects.some(
            (project) => project.id === storedSelectedId,
          )
            ? storedSelectedId
            : parsedProjects[0].id;
          setSelectedProjectId(selectedId);
        }
      } catch {
        window.localStorage.setItem(
          PROJECTS_STORAGE_KEY,
          JSON.stringify(initialProjects),
        );
      }

    }, 0);

    const handleProjectSelected = (event: Event) => {
      const projectId = (event as CustomEvent<number>).detail;
      setSelectedProjectId(projectId);
    };

    window.addEventListener("fullreports-project-selected", handleProjectSelected);

    return () => {
      window.clearTimeout(syncProjects);
      window.removeEventListener("fullreports-project-selected", handleProjectSelected);
    };
  }, []);

  const handleProjectChange = (projectId: number) => {
    setSelectedProjectId(projectId);
    window.localStorage.setItem(SELECTED_PROJECT_STORAGE_KEY, String(projectId));
  };

  return (
    <Box minH="100vh" bg="#F7F9FC">
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onToggle={() => setSidebarOpen(false)}
      />

      <Box
        minH="100vh"
        ml={{ base: sidebarOpen ? "220px" : 0, lg: sidebarOpen ? "220px" : 0 }}
        transition="margin-left .25s ease"
      >
        <AppHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
          selectedProjectId={selectedProjectId}
          projects={projects}
          onProjectChange={handleProjectChange}
        />

        <Box as="main" minW="0" overflow="auto">
          {children}
        </Box>
      </Box>
    </Box>
  );
}