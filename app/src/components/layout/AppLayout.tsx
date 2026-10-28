"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { usePathname } from "next/navigation";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import {
  initialProjects,
  PROJECTS_STORAGE_KEY,
  SELECTED_PROJECT_STORAGE_KEY,
} from "../../data/projects";
import type { Project } from "../../types/project";
import {
  finishAppLoading,
  subscribeToAppLoading,
  startAppLoading,
} from "../../lib/app-loading";

interface AppLayoutProps {
  children: ReactNode;
}


export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjects[0].id);
  const currentPathname = useRef(pathname);
  const loadingTimeout = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    const unsubscribeFromLoading = subscribeToAppLoading((active) => {
      setIsLoading(active);
      if (loadingTimeout.current) window.clearTimeout(loadingTimeout.current);
      loadingTimeout.current = active
        ? window.setTimeout(() => setIsLoading(false), 15000)
        : null;
    });

    const desktopMedia = window.matchMedia("(min-width: 62rem)");
    const syncSidebar = () => setSidebarOpen(desktopMedia.matches);
    syncSidebar();
    desktopMedia.addEventListener("change", syncSidebar);
    const handleDataError = (event: Event) => {
      const message = (event as CustomEvent<string>).detail;
      setDataError(typeof message === "string" ? message : "No se pudieron sincronizar los datos.");
    };
    window.addEventListener("fullreports-data-error", handleDataError);

    const loadWorkerProject = async () => {
      try {
        const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
        if (!sessionResponse.ok) throw new Error("No se pudo consultar la sesión.");
        const session = await sessionResponse.json() as { user?: { role?: string } | null };
        if (session.user?.role !== "trabajador") return;
        const response = await fetch("/api/workforce/projects", { cache: "no-store" });
        const data = await response.json() as { projects?: Project[]; error?: string };
        if (!response.ok) throw new Error(data.error || "No se pudo cargar la obra asignada.");
        if (!active) return;
        const assignedProjects = data.projects ?? [];
        setProjects(assignedProjects);
        if (assignedProjects[0]) setSelectedProjectId(assignedProjects[0].id);
      } catch (error) {
        console.error("No se pudo cargar la obra asignada al trabajador.", error);
      }
    };
    void loadWorkerProject();

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
    const handleProjectsUpdated = () => {
      try {
        const storedProjects = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
        if (storedProjects) {
          const nextProjects = JSON.parse(storedProjects) as Project[];
          setProjects(nextProjects);
          setSelectedProjectId((current) =>
            nextProjects.some((project) => project.id === current) ? current : nextProjects[0]?.id ?? 0,
          );
        }
      } catch {
        setDataError("No se pudieron leer las obras almacenadas en este navegador.");
      }
    };

    const handleNavigationClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (
        destination.pathname === currentPathname.current &&
        destination.search === window.location.search &&
        destination.hash === window.location.hash
      ) {
        return;
      }

      startAppLoading();
    };

    window.addEventListener("fullreports-project-selected", handleProjectSelected);
    window.addEventListener("fullreports-projects-updated", handleProjectsUpdated);
    document.addEventListener("click", handleNavigationClick, true);
    window.addEventListener("popstate", startAppLoading);

    return () => {
      active = false;
      desktopMedia.removeEventListener("change", syncSidebar);
      window.removeEventListener("fullreports-data-error", handleDataError);
      window.clearTimeout(syncProjects);
      if (loadingTimeout.current) window.clearTimeout(loadingTimeout.current);
      window.removeEventListener("fullreports-project-selected", handleProjectSelected);
      window.removeEventListener("fullreports-projects-updated", handleProjectsUpdated);
      unsubscribeFromLoading();
      document.removeEventListener("click", handleNavigationClick, true);
      window.removeEventListener("popstate", startAppLoading);
    };
  }, []);

  useEffect(() => {
    if (currentPathname.current !== pathname) {
      currentPathname.current = pathname;
      finishAppLoading();
    }
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
      />

      <Box
        minH="100vh"
        ml={{ base: 0, lg: sidebarOpen ? "220px" : "0" }}
        transition="margin-left .25s ease"
      >
        <AppHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
          selectedProjectId={selectedProjectId}
          projects={projects}
          onProjectChange={handleProjectChange}
        />

        {dataError && (
          <Box position="fixed" top="76px" right={{ base: 3, md: 6 }} zIndex={1500} maxW={{ base: "calc(100vw - 1.5rem)", md: "440px" }} w="full" p={4} bg="#FFF4F2" border="1px solid #F3C4BE" borderRadius="12px" boxShadow="0 8px 22px rgba(38, 50, 56, 0.12)" role="alert">
            <Flex align="flex-start" justify="space-between" gap={3}>
              <Text fontSize="sm" color="#8F2118">{dataError}</Text>
              <Button size="xs" variant="ghost" color="#8F2118" onClick={() => setDataError("")}>Cerrar</Button>
            </Flex>
          </Box>
        )}

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
        aria-label="Cargando"
        aria-hidden={!isLoading}
        pointerEvents={isLoading ? "auto" : "none"}
      >
        <Box className="app-loading-indicator" aria-hidden="true">
          <Box className="app-loading-spinner" />
          <Box className="app-loading-mark">
            <span>F</span>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}