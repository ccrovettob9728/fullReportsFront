"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { Box, Text } from "@chakra-ui/react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settledPathname, setSettledPathname] = useState("");
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjects[0].id);
  const hasMounted = useRef(false);
  const isLoading = pathname !== settledPathname;

  useEffect(() => {
    const loadingDuration = hasMounted.current ? 420 : 720;
    hasMounted.current = true;
    const loadingTimeout = window.setTimeout(
      () => setSettledPathname(pathname),
      loadingDuration,
    );

    const desktopMedia = window.matchMedia("(min-width: 62rem)");
    const syncSidebar = () => setSidebarOpen(desktopMedia.matches);
    syncSidebar();
    desktopMedia.addEventListener("change", syncSidebar);

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
      desktopMedia.removeEventListener("change", syncSidebar);
      window.clearTimeout(loadingTimeout);
      window.clearTimeout(syncProjects);
      window.removeEventListener("fullreports-project-selected", handleProjectSelected);
    };
  }, [pathname]);

  if (pathname === "/login" || pathname === "/sin-acceso") return children;

  const handleProjectChange = (projectId: number) => {
    setSelectedProjectId(projectId);
    window.localStorage.setItem(SELECTED_PROJECT_STORAGE_KEY, String(projectId));
    window.dispatchEvent(new CustomEvent("fullreports-project-selected", { detail: projectId }));
  };

  return (
    <Box minH="100vh" bg="#F7F9FC" aria-busy={isLoading}>
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onToggle={() => setSidebarOpen(false)}
      />

      <Box
        minH="100vh"
        ml={{ base: 0, lg: sidebarOpen ? "220px" : 0 }}
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

      <Box
        className="app-loading-overlay"
        data-visible={isLoading}
        position="fixed"
        inset="0"
        zIndex={2000}
        display="flex"
        alignItems="center"
        justifyContent="center"
        px={4}
        role="status"
        aria-label="Cargando FullReports"
        aria-hidden={!isLoading}
        pointerEvents={isLoading ? "auto" : "none"}
      >
        <Box className="app-loading-panel" textAlign="center" w="full" maxW="340px">
          <Box className="app-loading-brand" mx="auto">
            <Image
              src="/logo.png"
              alt="FullReports"
              width={200}
              height={62}
              priority
            />
          </Box>
          <Text mt={6} fontSize="sm" fontWeight="700" color="#263238">
            Preparando tu espacio de trabajo
          </Text>
          <Text mt={1} fontSize="xs" color="#7A8694">
            Un momento, estamos organizando todo.
          </Text>
          <Box className="app-loading-track" mt={5} mx="auto">
            <Box className="app-loading-progress" />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}