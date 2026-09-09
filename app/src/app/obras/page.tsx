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

const emptyForm = {
  name: "",
  description: "",
  status: "active" as Project["status"],
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
  const [form, setForm] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    const syncProjects = window.setTimeout(() => {
      const storedProjects = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (!storedProjects) {
        window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(initialProjects));
        return;
      }

      try {
        const parsedProjects = JSON.parse(storedProjects) as Project[];
        if (parsedProjects.length > 0) setProjects(parsedProjects);
      } catch {
        window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(initialProjects));
      }
    }, 0);

    return () => window.clearTimeout(syncProjects);
  }, []);

  const persistProjects = (nextProjects: Project[]) => {
    setProjects(nextProjects);
    window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(nextProjects));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) return;

    const nextProject: Project = {
      id: Date.now(),
      name: form.name.trim(),
      description: form.description.trim() || "Sin descripción",
      status: form.status,
    };

    persistProjects([...projects, nextProject]);
    setForm(emptyForm);
    setFormOpen(false);
  };

  const handleDelete = (id: number) => {
    const nextProjects = projects.filter((project) => project.id !== id);
    if (nextProjects.length === 0) return;
    persistProjects(nextProjects);
  };

  return (
    <Box maxW="1600px" mx="auto" px={{ base: 4, md: 6, lg: 8 }} py={{ base: 5, md: 7 }}>
        <Flex align={{ base: "flex-start", md: "center" }} justify="space-between" direction={{ base: "column", md: "row" }} gap={4} mb={6}>
          <Box>
            <Text fontSize="sm" color="#7A8694" mb={1}>Gestión de obras</Text>
            <Heading size="lg" color="#263238">Obras y proyectos</Heading>
            <Text mt={1} fontSize="sm" color="#7A8694">Crea y administra los proyectos disponibles en tu dashboard.</Text>
          </Box>
          <Button bg="#2F507F" color="white" onClick={() => setFormOpen(true)}>
            <Plus size={16} />
            Nueva obra
          </Button>
        </Flex>

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
                  <Field.Root gridColumn={{ base: "auto", md: "span 2" }}>
                    <Field.Label color="#52606B">Descripción</Field.Label>
                    <Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Describe brevemente la obra" borderColor="#DCE3EA" rows={3} />
                  </Field.Root>
                </SimpleGrid>
                <Flex justify="flex-end" gap={3} mt={5}>
                  <Button type="button" variant="outline" onClick={() => { setForm(emptyForm); setFormOpen(false); }}>Cancelar</Button>
                  <Button type="submit" bg="#2F507F" color="white"><Plus size={16} />Crear obra</Button>
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
                  </Card.Body>
                </Link>
                <Card.Body pt={0} px={5} pb={5}>
                  <Flex align="center" justify="space-between" pt={4} borderTop="1px solid" borderColor="#EEF1F4">
                    <Text fontSize="xs" fontWeight="700" color={statusColors[project.status]}>{statusLabels[project.status]}</Text>
                    <Button variant="ghost" size="sm" color="#B42318" onClick={() => handleDelete(project.id)} disabled={projects.length === 1}>
                      <Trash2 size={15} />
                      Eliminar
                    </Button>
                  </Flex>
                </Card.Body>
              </Card.Root>
            );
          })}
        </SimpleGrid>
    </Box>
  );
}
