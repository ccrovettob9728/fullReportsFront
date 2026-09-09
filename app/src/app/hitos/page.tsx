"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CalendarDays, Check, Edit3, Plus, Trash2, X } from "lucide-react";
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
  VStack,
} from "@chakra-ui/react";

type MilestoneStatus = "todo" | "in-progress" | "done";

type Milestone = {
  id: number;
  title: string;
  description: string;
  date: string;
  status: MilestoneStatus;
};

const columns: Array<{
  status: MilestoneStatus;
  title: string;
  color: string;
  background: string;
}> = [
  {
    status: "todo",
    title: "Por hacer",
    color: "#B18419",
    background: "#FBF4D9",
  },
  {
    status: "in-progress",
    title: "En progreso",
    color: "#2F507F",
    background: "#E8EEF7",
  },
  {
    status: "done",
    title: "Listo",
    color: "#2E9B6F",
    background: "#E8F5EF",
  },
];

const initialMilestones: Milestone[] = [
  {
    id: 1,
    title: "Permisos municipales aprobados",
    description: "Confirmar la recepción de todos los permisos.",
    date: "2026-09-18",
    status: "todo",
  },
  {
    id: 2,
    title: "Instalaciones eléctricas",
    description: "Completar la revisión de canalizaciones y tableros.",
    date: "2026-09-25",
    status: "in-progress",
  },
  {
    id: 3,
    title: "Fundaciones terminadas",
    description: "Hito validado por el supervisor de obra.",
    date: "2026-08-29",
    status: "done",
  },
];

const emptyForm = {
  title: "",
  description: "",
  date: "",
  status: "todo" as MilestoneStatus,
};

export default function MilestonesPage() {
  const [milestones, setMilestones] = useState(initialMilestones);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const isEditing = editingId !== null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.title.trim()) {
      return;
    }

    if (editingId !== null) {
      setMilestones((current) =>
        current.map((milestone) =>
          milestone.id === editingId
            ? { ...milestone, ...form, title: form.title.trim() }
            : milestone,
        ),
      );
    } else {
      setMilestones((current) => [
        ...current,
        {
          id: Date.now(),
          ...form,
          title: form.title.trim(),
        },
      ]);
    }

    setForm(emptyForm);
    setEditingId(null);
    setFormOpen(false);
  };

  const handleEdit = (milestone: Milestone) => {
    setEditingId(milestone.id);
    setFormOpen(true);
    setForm({
      title: milestone.title,
      description: milestone.description,
      date: milestone.date,
      status: milestone.status,
    });
  };

  const handleDelete = (id: number) => {
    setMilestones((current) =>
      current.filter((milestone) => milestone.id !== id),
    );

    if (editingId === id) {
      setEditingId(null);
      setForm(emptyForm);
      setFormOpen(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(false);
  };

  return (
    <Box maxW="1600px" mx="auto" px={{ base: 4, md: 6, lg: 8 }} py={{ base: 5, md: 7 }}>
        <Flex
          align={{ base: "flex-start", md: "center" }}
          justify="space-between"
          direction={{ base: "column", md: "row" }}
          gap={4}
          mb={6}
        >
          <Box>
            <Text fontSize="sm" color="#7A8694" mb={1}>
              Proyecto Condominio La Serena
            </Text>
            <Heading size="lg" color="#263238">
              Hitos del proyecto
            </Heading>
            <Text mt={1} fontSize="sm" color="#7A8694">
              Organiza los objetivos principales de la obra por estado.
            </Text>
          </Box>

          <Button
            colorPalette="blue"
            bg="#2F507F"
            color="white"
            onClick={() => {
              setEditingId(null);
              setForm(emptyForm);
              setFormOpen(true);
            }}
          >
            <Plus size={16} />
            Nuevo hito
          </Button>
        </Flex>

        {formOpen && (
        <Card.Root mb={7} border="1px solid" borderColor="#E8EDF3" borderRadius="18px" bg="white">
          <Card.Body p={{ base: 4, md: 6 }}>
            <Flex align="center" justify="space-between" gap={2} mb={5}>
              <Heading size="sm" color="#263238">
                {isEditing ? "Modificar hito" : "Crear hito"}
              </Heading>
              <Button variant="ghost" size="sm" onClick={handleCancel} type="button">
                <X size={16} />
                Cerrar
              </Button>
            </Flex>

            <form onSubmit={handleSubmit}>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <Field.Root required>
                  <Field.Label color="#52606B">Nombre del hito</Field.Label>
                  <Input
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder="Ej. Estructura terminada"
                    borderColor="#DCE3EA"
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label color="#52606B">Fecha objetivo</Field.Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, date: event.target.value }))
                    }
                    borderColor="#DCE3EA"
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label color="#52606B">Estado</Field.Label>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status: event.target.value as MilestoneStatus,
                      }))
                    }
                    style={{
                      width: "100%",
                      height: "40px",
                      border: "1px solid #DCE3EA",
                      borderRadius: "6px",
                      padding: "0 12px",
                      color: "#263238",
                      background: "white",
                    }}
                  >
                    <option value="todo">Por hacer</option>
                    <option value="in-progress">En progreso</option>
                    <option value="done">Listo</option>
                  </select>
                </Field.Root>

                <Field.Root gridColumn={{ base: "auto", md: "span 1" }}>
                  <Field.Label color="#52606B">Descripción</Field.Label>
                  <Textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Añade una breve descripción"
                    borderColor="#DCE3EA"
                    rows={2}
                  />
                </Field.Root>
              </SimpleGrid>

              <Flex justify="flex-end" gap={3} mt={5}>
                {isEditing && (
                  <Button variant="outline" onClick={handleCancel} type="button">
                    <X size={16} />
                    Cancelar
                  </Button>
                )}
                <Button type="submit" bg="#2F507F" color="white">
                  {isEditing ? <Edit3 size={16} /> : <Plus size={16} />}
                  {isEditing ? "Guardar cambios" : "Crear hito"}
                </Button>
              </Flex>
            </form>
          </Card.Body>
        </Card.Root>
        )}

        <SimpleGrid columns={{ base: 1, lg: 3 }} gap={4} alignItems="start">
          {columns.map((column) => {
            const columnMilestones = milestones.filter(
              (milestone) => milestone.status === column.status,
            );

            return (
              <Box key={column.status} minW="0">
                <Flex align="center" justify="space-between" mb={3}>
                  <Flex align="center" gap={2}>
                    <Box w="9px" h="9px" borderRadius="full" bg={column.color} />
                    <Heading size="sm" color="#263238">
                      {column.title}
                    </Heading>
                  </Flex>
                  <Text fontSize="xs" fontWeight="700" color="#7A8694">
                    {columnMilestones.length}
                  </Text>
                </Flex>

                <VStack align="stretch" gap={2} minH="130px" p={2} borderRadius="12px" bg={column.background}>
                  {columnMilestones.length === 0 && (
                    <Flex align="center" justify="center" minH="140px">
                      <Text fontSize="sm" color="#7A8694">
                        No hay hitos en esta columna.
                      </Text>
                    </Flex>
                  )}

                  {columnMilestones.map((milestone) => (
                    <Card.Root key={milestone.id} border="1px solid" borderColor={`${column.color}35`} borderRadius="10px" bg="white" boxShadow="0 2px 8px rgba(38, 50, 56, 0.04)">
                      <Link href={`/hitos/${milestone.id}`} style={{ textDecoration: "none" }}>
                        <Card.Body p={3} _hover={{ bg: "#FAFCFE" }}>
                          <Flex justify="space-between" align="flex-start" gap={2}>
                            <Heading size="xs" color="#263238" lineHeight="1.35">
                              {milestone.title}
                            </Heading>
                            <Box color={column.color} flexShrink={0}>
                              <Check size={15} />
                            </Box>
                          </Flex>

                          <Text mt={1} fontSize="xs" color="#7A8694" lineHeight="1.4" lineClamp="2">
                            {milestone.description || "Sin descripción"}
                          </Text>

                          {milestone.date && (
                            <Flex align="center" gap={1} mt={2} color="#52606B">
                              <CalendarDays size={12} />
                              <Text fontSize="10px">
                                {new Date(`${milestone.date}T12:00:00`).toLocaleDateString("es-CL")}
                              </Text>
                            </Flex>
                          )}
                        </Card.Body>
                      </Link>
                      <Flex justify="flex-end" gap={1} px={2} pb={2}>
                        <Button variant="ghost" size="xs" color="#52606B" onClick={() => handleEdit(milestone)}>
                          <Edit3 size={13} />
                        </Button>
                        <Button variant="ghost" size="xs" color="#B42318" onClick={() => handleDelete(milestone.id)}>
                          <Trash2 size={13} />
                        </Button>
                      </Flex>
                    </Card.Root>
                  ))}
                </VStack>
              </Box>
            );
          })}
        </SimpleGrid>
    </Box>
  );
}
