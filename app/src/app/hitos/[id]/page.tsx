"use client";

import { use, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock3,
  Columns3,
  Download,
  Edit3,
  FileText,
  GripVertical,
  Image as ImageIcon,
  Plus,
  Trash2,
  X,
} from "lucide-react";
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

type TaskStatus = "todo" | "in-progress" | "done";

type Task = {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  imageUrl?: string;
  documentUrl?: string;
  documentName?: string;
};

const taskColumns: Array<{
  status: TaskStatus;
  title: string;
  color: string;
  background: string;
}> = [
  { status: "todo", title: "Por hacer", color: "#B18419", background: "#FBF4D9" },
  { status: "in-progress", title: "En progreso", color: "#2F507F", background: "#E8EEF7" },
  { status: "done", title: "Hecha", color: "#2E9B6F", background: "#E8F5EF" },
];

const milestoneNames: Record<string, string> = {
  "1": "Permisos municipales aprobados",
  "2": "Instalaciones eléctricas",
  "3": "Fundaciones terminadas",
};

const initialTasks: Task[] = [
  {
    id: 1,
    title: "Reunir documentación requerida",
    description: "Compilar certificados y planos para la presentación.",
    status: "todo",
    imageUrl: "/logo.png",
  },
  {
    id: 2,
    title: "Revisar antecedentes con el supervisor",
    description: "Validar que el expediente esté completo.",
    status: "in-progress",
    documentUrl: "/file.svg",
    documentName: "antecedentes.svg",
  },
  {
    id: 3,
    title: "Enviar solicitud municipal",
    description: "Solicitud enviada y registrada correctamente.",
    status: "done",
    imageUrl: "/logo.png",
    documentUrl: "/file.svg",
    documentName: "solicitud.svg",
  },
];

const emptyForm = {
  title: "",
  description: "",
  status: "todo" as TaskStatus,
  imageUrl: "",
  documentUrl: "",
  documentName: "",
};

export default function MilestoneDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const milestoneName = milestoneNames[id] ?? "Hito del proyecto";
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) return;

    if (editingId !== null) {
      setTasks((current) =>
        current.map((task) =>
          task.id === editingId ? { ...task, ...form, title: form.title.trim() } : task,
        ),
      );
    } else {
      setTasks((current) => [
        ...current,
        { id: Date.now(), ...form, title: form.title.trim() },
      ]);
    }

    setForm(emptyForm);
    setEditingId(null);
    setFormOpen(false);
  };

  const editTask = (task: Task) => {
    setEditingId(task.id);
    setForm({
      title: task.title,
      description: task.description,
      status: task.status,
      imageUrl: task.imageUrl ?? "",
      documentUrl: task.documentUrl ?? "",
      documentName: task.documentName ?? "",
    });
    setFormOpen(true);
  };

  const moveTask = (status: TaskStatus) => {
    if (draggedTaskId === null) return;

    setTasks((current) =>
      current.map((task) =>
        task.id === draggedTaskId ? { ...task, status } : task,
      ),
    );
    setDraggedTaskId(null);
  };

  const deleteTask = (id: number) => {
    setTasks((current) => current.filter((task) => task.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setForm(emptyForm);
      setFormOpen(false);
    }
  };

  const closeForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(false);
  };

  return (
    <Box maxW="1600px" mx="auto" px={{ base: 4, md: 6, lg: 8 }} py={{ base: 5, md: 7 }}>
        <Flex align={{ base: "flex-start", md: "center" }} justify="space-between" direction={{ base: "column", md: "row" }} gap={4} mb={6}>
          <Box>
            <Link href="/hitos" style={{ textDecoration: "none" }}>
              <Flex align="center" gap={2} color="#2F507F" mb={3}>
                <ArrowLeft size={16} />
                <Text fontSize="sm" fontWeight="600">Volver a hitos</Text>
              </Flex>
            </Link>
            <Text fontSize="sm" color="#7A8694" mb={1}>Proyecto Condominio La Serena</Text>
            <Heading size="lg" color="#263238">{milestoneName}</Heading>
            <Text mt={1} fontSize="sm" color="#7A8694">Tareas asociadas a este hito.</Text>
          </Box>
          <Button bg="#2F507F" color="white" onClick={() => { setEditingId(null); setForm(emptyForm); setFormOpen(true); }}>
            <Plus size={16} />
            Nueva tarea
          </Button>
        </Flex>

        {formOpen && (
          <Card.Root mb={6} border="1px solid" borderColor="#E8EDF3" borderRadius="16px" bg="white">
            <Card.Body p={{ base: 4, md: 6 }}>
              <Flex align="center" justify="space-between" mb={5}>
                <Heading size="sm" color="#263238">{editingId === null ? "Crear tarea" : "Modificar tarea"}</Heading>
                <Button variant="ghost" size="sm" onClick={closeForm}><X size={16} />Cerrar</Button>
              </Flex>
              <form onSubmit={handleSubmit}>
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                  <Field.Root required>
                    <Field.Label color="#52606B">Nombre de la tarea</Field.Label>
                    <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ej. Revisar planos" borderColor="#DCE3EA" />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label color="#52606B">Estado</Field.Label>
                    <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TaskStatus }))} style={{ width: "100%", height: "40px", border: "1px solid #DCE3EA", borderRadius: "6px", padding: "0 12px", color: "#263238", background: "white" }}>
                      <option value="todo">Por hacer</option>
                      <option value="in-progress">En progreso</option>
                      <option value="done">Listo</option>
                    </select>
                  </Field.Root>
                  <Field.Root gridColumn={{ base: "auto", md: "span 2" }}>
                    <Field.Label color="#52606B">Descripción</Field.Label>
                    <Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Añade una breve descripción" borderColor="#DCE3EA" rows={2} />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label color="#52606B">URL de imagen</Field.Label>
                    <Input value={form.imageUrl} onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="/public/avance.jpg" borderColor="#DCE3EA" />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label color="#52606B">URL de documento</Field.Label>
                    <Input value={form.documentUrl} onChange={(event) => setForm((current) => ({ ...current, documentUrl: event.target.value }))} placeholder="/public/informe.pdf" borderColor="#DCE3EA" />
                  </Field.Root>
                  <Field.Root gridColumn={{ base: "auto", md: "span 2" }}>
                    <Field.Label color="#52606B">Nombre del documento</Field.Label>
                    <Input value={form.documentName} onChange={(event) => setForm((current) => ({ ...current, documentName: event.target.value }))} placeholder="informe-de-avance.pdf" borderColor="#DCE3EA" />
                  </Field.Root>
                </SimpleGrid>
                <Flex justify="flex-end" gap={3} mt={5}>
                  <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
                  <Button type="submit" bg="#2F507F" color="white">{editingId === null ? "Crear tarea" : "Guardar cambios"}</Button>
                </Flex>
              </form>
            </Card.Body>
          </Card.Root>
        )}

        <Flex align="center" gap={2} mb={4}>
          <Columns3 size={18} color="#2F507F" />
          <Heading size="sm" color="#263238">Tablero de tareas</Heading>
          <Text fontSize="xs" color="#7A8694">{tasks.length} tareas</Text>
        </Flex>

        <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} alignItems="start">
          {taskColumns.map((column) => {
            const columnTasks = tasks.filter((task) => task.status === column.status);
            return (
              <Box
                key={column.status}
                minH="360px"
                p={3}
                borderRadius="14px"
                bg={column.background}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => moveTask(column.status)}
              >
                <Flex align="center" justify="space-between" mb={3} px={1}>
                  <Flex align="center" gap={2}>
                    <Box w="9px" h="9px" borderRadius="full" bg={column.color} />
                    <Heading size="sm" color="#263238">{column.title}</Heading>
                  </Flex>
                  <Text fontSize="xs" fontWeight="700" color="#7A8694">{columnTasks.length}</Text>
                </Flex>

                <Flex direction="column" gap={3}>
                  {columnTasks.map((task) => (
                    <Card.Root
                      key={task.id}
                      draggable
                      onDragStart={() => setDraggedTaskId(task.id)}
                      onDragEnd={() => setDraggedTaskId(null)}
                      border="1px solid"
                      borderColor={`${column.color}35`}
                      borderRadius="10px"
                      bg="white"
                      boxShadow="0 2px 8px rgba(38, 50, 56, 0.05)"
                      cursor="grab"
                      opacity={draggedTaskId === task.id ? 0.55 : 1}
                      _hover={{ transform: "translateY(-1px)", boxShadow: "0 5px 14px rgba(38, 50, 56, 0.1)" }}
                    >
                      <Card.Body
                        p={3}
                        cursor="pointer"
                        role="link"
                        tabIndex={0}
                        onClick={(event) => {
                          const target = event.target as HTMLElement;
                          if (target.closest("button, a")) return;
                          router.push(`/tareas/${task.id}`);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            router.push(`/tareas/${task.id}`);
                          }
                        }}
                      >
                        <Flex align="flex-start" gap={2}>
                          <GripVertical size={15} color="#9AA6B2" />
                          <Box flex="1" minW="0">
                            <Flex align="center" justify="space-between" gap={2}>
                              <Text fontSize="10px" fontWeight="700" color="#8A96A3">TASK-{String(task.id).padStart(3, "0")}</Text>
                              {task.status === "done" ? <CheckCircle2 size={15} color={column.color} /> : task.status === "in-progress" ? <Clock3 size={15} color={column.color} /> : <Circle size={15} color={column.color} />}
                            </Flex>
                            <Heading size="xs" color="#263238" lineHeight="1.35" mt={1}>{task.title}</Heading>
                            <Text mt={1} fontSize="xs" color="#7A8694" lineHeight="1.4">{task.description || "Sin descripción"}</Text>
                          </Box>
                        </Flex>

                        {task.imageUrl && (
                          <Box mt={3} borderRadius="7px" overflow="hidden" bg="#F1F4F7" maxH="110px">
                            <img src={task.imageUrl} alt={`Imagen de ${task.title}`} style={{ width: "100%", height: "110px", objectFit: "cover" }} />
                          </Box>
                        )}

                        {(task.imageUrl || task.documentUrl) && (
                          <Flex gap={2} mt={3} wrap="wrap">
                            {task.imageUrl && <Button asChild variant="outline" size="xs" color="#52606B"><a href={task.imageUrl} target="_blank" rel="noreferrer"><ImageIcon size={13} />Ver imagen</a></Button>}
                            {task.documentUrl && <Button asChild variant="outline" size="xs" color="#52606B"><a href={task.documentUrl} download={task.documentName || true}><FileText size={13} />{task.documentName || "Descargar documento"}<Download size={13} /></a></Button>}
                          </Flex>
                        )}

                        <Flex justify="flex-end" gap={1} mt={3}>
                          <Button variant="ghost" size="xs" color="#52606B" aria-label={`Editar ${task.title}`} onClick={() => editTask(task)}><Edit3 size={13} /></Button>
                          <Button variant="ghost" size="xs" color="#B42318" aria-label={`Eliminar ${task.title}`} onClick={() => deleteTask(task.id)}><Trash2 size={13} /></Button>
                        </Flex>
                      </Card.Body>
                    </Card.Root>
                  ))}
                  {columnTasks.length === 0 && <Flex align="center" justify="center" minH="180px"><Text fontSize="sm" color="#7A8694">Suelta una tarea aquí.</Text></Flex>}
                </Flex>
              </Box>
            );
          })}
        </SimpleGrid>
    </Box>
  );
}
