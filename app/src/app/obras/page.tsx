"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, PauseCircle, Plus, Trash2 } from "lucide-react";
import {
  Box,
  Button,
  Card,
  Field,
  Flex,
  Heading,
  Input,
  SimpleGrid,
  Text,
  Textarea,
} from "@chakra-ui/react";
import {
  initialProjects,
  PROJECTS_STORAGE_KEY,
  SELECTED_PROJECT_STORAGE_KEY,
} from "../../data/projects";
import type { Project } from "../../types/project";
import type { ManagedUser } from "../../lib/cognito-roles";
import type { ProjectMachine, WorkforceProject } from "../../types/workforce";
import { workforceRequest } from "../../lib/worker-api";
import { finishAppLoading, startAppLoading } from "../../lib/app-loading";

const createEmptyForm = () => {
  const today = new Date();
  const startDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  return {
    name: "",
    description: "",
    status: "active" as Project["status"],
    startDate,
    plannedEndDate: "",
    workerSubs: [] as string[],
  };
};

const formatDate = (date: string) => {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
};

const statusLabels: Record<Project["status"], string> = {
  active: "Activa",
  paused: "En pausa",
  completed: "Completada",
};

const statusColors: Record<Project["status"], string> = {
  active: "#2E9B6F",
  paused: "#B18419",
  completed: "#2F507F",
};

export default function ObrasPage() {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [form, setForm] = useState(createEmptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [workers, setWorkers] = useState<ManagedUser[]>([]);
  const [assignedByProject, setAssignedByProject] = useState<Record<number, string[]>>({});
  const [machinesByProject, setMachinesByProject] = useState<Record<number, ProjectMachine[]>>({});
  const [machineNames, setMachineNames] = useState<Record<number, string>>({});
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyProjectIds, setBusyProjectIds] = useState<number[]>([]);
  const [error, setError] = useState("");
  const canManage = role === "admin" || role === "superadmin";

  useEffect(() => {
    let active = true;
    const loadProjects = async () => {
      try {
        const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
        if (!sessionResponse.ok) throw new Error("No se pudo consultar la sesión.");
        const session = await sessionResponse.json() as { user?: { role?: string } | null };
        if (active) setRole(session.user?.role ?? "");

        let localProjects = initialProjects;
        const storedProjects = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
        if (storedProjects) {
          try {
            const parsed = JSON.parse(storedProjects) as Project[];
            if (parsed.length) localProjects = parsed;
          } catch {
            window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(initialProjects));
          }
        }

        let data = await workforceRequest<{ projects: WorkforceProject[]; workers?: ManagedUser[] }>("/api/workforce/projects?includeWorkers=1");
        if (data.projects.length === 0 && (session.user?.role === "admin" || session.user?.role === "superadmin")) {
          const seededProjects: WorkforceProject[] = [];
          for (const project of localProjects) {
            const result = await workforceRequest<{ project: WorkforceProject }>("/api/workforce/projects", {
              method: "POST",
              body: JSON.stringify({ project, workerSubs: [], preserveExisting: true }),
            });
            seededProjects.push(result.project);
          }
          data = await workforceRequest<{ projects: WorkforceProject[]; workers?: ManagedUser[] }>("/api/workforce/projects?includeWorkers=1");
          if (!data.projects.length) data.projects = seededProjects;
        }
        if (!active) return;
        const loadedProjects: WorkforceProject[] = data.projects.length
          ? data.projects
          : localProjects.map((project) => ({ ...project, assignedWorkers: [], workforceUsed: false }));
        setProjects(loadedProjects);
        setWorkers(data.workers ?? []);
        const assignments = Object.fromEntries(loadedProjects.map((project) => [
          project.id,
          project.assignedWorkers.map((worker) => worker.sub),
        ]));
        setAssignedByProject(assignments);
        window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(loadedProjects));
        window.dispatchEvent(new Event("fullreports-projects-updated"));
        const machineEntries = await Promise.all(loadedProjects.map(async (project) => {
          const response = await workforceRequest<{ machines: ProjectMachine[] }>(`/api/workforce/projects/${project.id}/machines`);
          return [project.id, response.machines] as const;
        }));
        if (active) setMachinesByProject(Object.fromEntries(machineEntries));
      } catch (reason) {
        if (active) {
          setError(reason instanceof Error ? reason.message : "No se pudieron cargar las obras.");
          const storedProjects = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
          if (storedProjects) {
            try {
              setProjects(JSON.parse(storedProjects) as Project[]);
            } catch {
              setProjects(initialProjects);
            }
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadProjects();
    return () => { active = false; };
  }, []);

  const persistProjects = (nextProjects: Project[]) => {
    setProjects(nextProjects);
    window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(nextProjects));
    window.dispatchEvent(new Event("fullreports-projects-updated"));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) return;

    const nextProject: Project = {
      id: Date.now(),
      name: form.name.trim(),
      description: form.description.trim() || "Sin descripción",
      status: form.status,
      startDate: form.startDate,
      plannedEndDate: form.plannedEndDate,
    };

    setError("");
    startAppLoading();
    try {
      const result = await workforceRequest<{ project: WorkforceProject }>("/api/workforce/projects", {
        method: "POST",
        body: JSON.stringify({ project: nextProject, workerSubs: form.workerSubs }),
      });
      persistProjects([...projects, result.project]);
      setAssignedByProject((current) => ({ ...current, [nextProject.id]: form.workerSubs }));
      setMachinesByProject((current) => ({ ...current, [nextProject.id]: [] }));
      setForm(createEmptyForm());
      setFormOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo crear la obra.");
    } finally {
      finishAppLoading();
    }
  };

  const handleDelete = async (id: number) => {
    if (projects.length === 1) return;
    setError("");
    startAppLoading();
    try {
      await workforceRequest(`/api/workforce/projects?id=${id}`, { method: "DELETE" });
      persistProjects(projects.filter((project) => project.id !== id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo eliminar la obra.");
    } finally {
      finishAppLoading();
    }
  };

  const updateProjectWorkers = async (project: Project, workerSubs: string[]) => {
    setBusyProjectIds((current) => [...current, project.id]);
    setError("");
    startAppLoading();
    try {
      const result = await workforceRequest<{ project: WorkforceProject }>("/api/workforce/projects", {
        method: "POST",
        body: JSON.stringify({ project, workerSubs }),
      });
      setAssignedByProject((current) => ({ ...current, [project.id]: workerSubs }));
      persistProjects(projects.map((item) => item.id === project.id ? result.project : item));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo actualizar la asignación.");
    } finally {
      finishAppLoading();
      setBusyProjectIds((current) => current.filter((projectId) => projectId !== project.id));
    }
  };

  const addMachine = async (projectId: number) => {
    const name = machineNames[projectId]?.trim();
    if (!name) return;
    setBusyProjectIds((current) => [...current, projectId]);
    setError("");
    startAppLoading();
    try {
      const result = await workforceRequest<{ machine: ProjectMachine }>(`/api/workforce/projects/${projectId}/machines`, {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setMachinesByProject((current) => ({ ...current, [projectId]: [...(current[projectId] ?? []), result.machine] }));
      setMachineNames((current) => ({ ...current, [projectId]: "" }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo agregar la maquinaria.");
    } finally {
      finishAppLoading();
      setBusyProjectIds((current) => current.filter((busyId) => busyId !== projectId));
    }
  };

  const toggleMachine = async (projectId: number, machine: ProjectMachine) => {
    setError("");
    startAppLoading();
    try {
      const result = await workforceRequest<{ machine: ProjectMachine }>(`/api/workforce/projects/${projectId}/machines`, {
        method: "PATCH",
        body: JSON.stringify({ id: machine.id, active: !machine.active }),
      });
      setMachinesByProject((current) => ({
        ...current,
        [projectId]: (current[projectId] ?? []).map((item) => item.id === machine.id ? result.machine : item),
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo actualizar la maquinaria.");
    } finally {
      finishAppLoading();
    }
  };

  return (
    <Box maxW="1600px" mx="auto" px={{ base: 4, md: 6, lg: 8 }} py={{ base: 5, md: 7 }}>
        <Flex align={{ base: "flex-start", md: "center" }} justify="space-between" direction={{ base: "column", md: "row" }} gap={4} mb={6}>
          <Box>
            <Text fontSize="sm" color="#7A8694" mb={1}>Gestión de obras</Text>
            <Heading size="lg" color="#263238">Obras y proyectos</Heading>
            <Text mt={1} fontSize="sm" color="#7A8694">Crea y administra los proyectos disponibles en tu dashboard.</Text>
          </Box>
          {canManage && (
            <Button w={{ base: "full", md: "auto" }} bg="#2F507F" color="white" onClick={() => setFormOpen(true)} disabled={loading}>
              <Plus size={16} />
              Nueva obra
            </Button>
          )}
        </Flex>

        {error && <Text mb={4} color="#B42318" role="alert">{error}</Text>}
        {loading && <Text mb={4} fontSize="sm" color="#7A8694">Cargando obras y asignaciones...</Text>}

        {formOpen && (
          <Card.Root mb={6} border="1px solid" borderColor="#E8EDF3" borderRadius="16px" bg="white">
            <Card.Body p={{ base: 4, md: 6 }}>
              <Heading size="sm" color="#263238" mb={5}>Crear proyecto</Heading>
              <form onSubmit={handleSubmit}>
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                  <Field.Root required>
                    <Field.Label color="#52606B">Nombre del proyecto</Field.Label>
                    <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ej. Condominio Los Robles" borderColor="#DCE3EA" />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label color="#52606B">Estado</Field.Label>
                    <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as Project["status"] }))} style={{ width: "100%", height: "40px", border: "1px solid #DCE3EA", borderRadius: "6px", padding: "0 12px", color: "#263238", background: "white" }}>
                      <option value="active">Activa</option>
                      <option value="paused">En pausa</option>
                      <option value="completed">Completada</option>
                    </select>
                  </Field.Root>
                  <Field.Root required>
                    <Field.Label color="#52606B">Fecha de inicio</Field.Label>
                    <Input type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} borderColor="#DCE3EA" />
                  </Field.Root>
                  <Field.Root required>
                    <Field.Label color="#52606B">Fecha presupuestada de término</Field.Label>
                    <Input type="date" value={form.plannedEndDate} min={form.startDate} onChange={(event) => setForm((current) => ({ ...current, plannedEndDate: event.target.value }))} borderColor="#DCE3EA" />
                  </Field.Root>
                  <Field.Root gridColumn={{ base: "auto", md: "span 2" }}>
                    <Field.Label color="#52606B">Descripción</Field.Label>
                    <Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Describe brevemente la obra" borderColor="#DCE3EA" rows={3} />
                  </Field.Root>
                  <Field.Root gridColumn={{ base: "auto", md: "span 2" }}>
                    <Field.Label color="#52606B">Trabajadores asignados</Field.Label>
                    <Box display="grid" gridTemplateColumns={{ base: "1fr", sm: "repeat(2, minmax(0, 1fr))" }} gap={2} p={3} border="1px solid #DCE3EA" borderRadius="8px">
                      {workers.length ? workers.map((worker) => (
                        <label key={worker.sub} style={{ display: "flex", alignItems: "center", gap: 8, color: "#36434F", fontSize: 14 }}>
                          <input
                            type="checkbox"
                            checked={form.workerSubs.includes(worker.sub ?? "")}
                            onChange={(event) => setForm((current) => ({
                              ...current,
                              workerSubs: event.target.checked
                                ? [...current.workerSubs, worker.sub ?? ""].filter(Boolean)
                                : current.workerSubs.filter((sub) => sub !== worker.sub),
                            }))}
                          />
                          {worker.name} <span style={{ color: "#7A8694" }}>({worker.email})</span>
                        </label>
                      )) : <Text fontSize="sm" color="#7A8694">No hay cuentas con rol trabajador disponibles.</Text>}
                    </Box>
                    <Text mt={1} fontSize="xs" color="#7A8694">Cada trabajador puede tener una sola obra asignada.</Text>
                  </Field.Root>
                </SimpleGrid>
                <Flex direction={{ base: "column-reverse", sm: "row" }} justify="flex-end" gap={3} mt={5}>
                  <Button w={{ base: "full", sm: "auto" }} type="button" variant="outline" onClick={() => { setForm(createEmptyForm()); setFormOpen(false); }}>Cancelar</Button>
                  <Button w={{ base: "full", sm: "auto" }} type="submit" bg="#2F507F" color="white"><Plus size={16} />Crear obra</Button>
                </Flex>
              </form>
            </Card.Body>
          </Card.Root>
        )}

        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
          {projects.map((project) => {
            const StatusIcon = project.status === "active" ? CheckCircle2 : project.status === "paused" ? PauseCircle : Building2;
            return (
              <Card.Root key={project.id} border="1px solid" borderColor="#E8EDF3" borderRadius="14px" bg="white" boxShadow="0 3px 14px rgba(38, 50, 56, 0.04)">
                <Link
                  href={`/dashboard?project=${project.id}`}
                  style={{ textDecoration: "none" }}
                  onClick={() => {
                    window.localStorage.setItem(SELECTED_PROJECT_STORAGE_KEY, String(project.id));
                    window.dispatchEvent(new CustomEvent("fullreports-project-selected", { detail: project.id }));
                  }}
                >
                  <Card.Body p={5} cursor="pointer" _hover={{ bg: "#FAFCFE" }}>
                    <Flex justify="space-between" align="flex-start" gap={3}>
                      <Flex align="center" gap={3} minW="0">
                        <Box w="38px" h="38px" borderRadius="10px" bg="#EEF4FB" color="#2F507F" display="flex" alignItems="center" justifyContent="center" flexShrink={0}><Building2 size={18} /></Box>
                        <Heading size="sm" color="#263238" lineHeight="1.35">{project.name}</Heading>
                      </Flex>
                      <Box color={statusColors[project.status]} flexShrink={0}><StatusIcon size={18} /></Box>
                    </Flex>
                    <Text mt={4} fontSize="sm" color="#7A8694" minH="42px">{project.description}</Text>
                    {project.startDate && (
                      <Text mt={2} fontSize="xs" color="#7A8694">
                        Inicio: {formatDate(project.startDate)}
                        {project.plannedEndDate && ` · Término presupuestado: ${formatDate(project.plannedEndDate)}`}
                      </Text>
                    )}
                  </Card.Body>
                </Link>
                <Card.Body p={5} pt={0}>
                  {canManage && (
                    <Box pt={4} borderTop="1px solid #EEF1F4">
                      <Text as="label" fontSize="xs" fontWeight="700" color="#52606B">Trabajadores asignados</Text>
                      <Box mt={2} display="grid" gridTemplateColumns={{ base: "1fr", sm: "repeat(2, minmax(0, 1fr))" }} gap={2}>
                        {workers.length ? workers.map((worker) => {
                          const selectedWorkers = assignedByProject[project.id] ?? [];
                          return (
                            <label key={worker.sub} style={{ display: "flex", alignItems: "center", gap: 8, color: "#52606B", fontSize: 13 }}>
                              <input
                                type="checkbox"
                                checked={selectedWorkers.includes(worker.sub ?? "")}
                                disabled={busyProjectIds.includes(project.id) || !worker.sub}
                                onChange={(event) => {
                                  const nextWorkerSubs = event.target.checked
                                    ? [...selectedWorkers, worker.sub ?? ""].filter(Boolean)
                                    : selectedWorkers.filter((sub) => sub !== worker.sub);
                                  void updateProjectWorkers(project, nextWorkerSubs);
                                }}
                              />
                              {worker.name}
                            </label>
                          );
                        }) : <Text fontSize="xs" color="#7A8694">No hay trabajadores disponibles.</Text>}
                      </Box>

                      <Text mt={4} fontSize="xs" fontWeight="700" color="#52606B">Maquinaria de la obra</Text>
                      <Flex direction={{ base: "column", sm: "row" }} gap={2} mt={2}>
                        <Input
                          value={machineNames[project.id] ?? ""}
                          onChange={(event) => setMachineNames((current) => ({ ...current, [project.id]: event.target.value }))}
                          placeholder="Ej. Excavadora"
                          aria-label={`Nueva maquinaria para ${project.name}`}
                          borderColor="#DCE3EA"
                        />
                        <Button type="button" bg="#2F507F" color="white" onClick={() => addMachine(project.id)} disabled={busyProjectIds.includes(project.id)}>
                          <Plus size={15} />Agregar
                        </Button>
                      </Flex>
                      {(machinesByProject[project.id] ?? []).length ? (
                        <Flex direction="column" gap={1} mt={2}>
                          {(machinesByProject[project.id] ?? []).map((machine) => (
                            <Flex key={machine.id} justify="space-between" align="center" gap={2} py={1}>
                              <Text fontSize="sm" color={machine.active ? "#36434F" : "#9AA4AE"}>{machine.name}{machine.active ? "" : " · inactiva"}</Text>
                              <Button type="button" size="xs" variant="outline" onClick={() => toggleMachine(project.id, machine)}>
                                {machine.active ? "Desactivar" : "Activar"}
                              </Button>
                            </Flex>
                          ))}
                        </Flex>
                      ) : <Text mt={2} fontSize="xs" color="#7A8694">Aún no hay maquinaria registrada.</Text>}
                    </Box>
                  )}
                  <Flex align="center" justify="space-between" gap={2} wrap="wrap" pt={4} borderTop="1px solid" borderColor="#EEF1F4">
                    <Text fontSize="xs" fontWeight="700" color={statusColors[project.status]}>{statusLabels[project.status]}</Text>
                    {canManage && (
                      <Button variant="ghost" size="sm" color="#B42318" onClick={() => handleDelete(project.id)} disabled={projects.length === 1}>
                        <Trash2 size={15} />
                        Eliminar
                      </Button>
                    )}
                  </Flex>
                </Card.Body>
              </Card.Root>
            );
          })}
        </SimpleGrid>
    </Box>
  );
}
