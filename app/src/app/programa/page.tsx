"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import readXlsxFile from "read-excel-file/browser";
import { FileUp, Plus, Upload } from "lucide-react";
import { Box, Button, Card, Field, Flex, Heading, Input, SimpleGrid, Text } from "@chakra-ui/react";
import { useProjectTasks } from "../../data/workspace";
import type { ProjectTask } from "../../data/tasks";

type ProgramTaskForm = {
  title: string;
  milestoneName: string;
  budgetedManHours: string;
  supervisor: string;
  scheduledDate: string;
  taskType: "scheduled" | "out-of-program";
};

const emptyForm: ProgramTaskForm = {
  title: "",
  milestoneName: "",
  budgetedManHours: "",
  supervisor: "",
  scheduledDate: "",
  taskType: "scheduled",
};

function normalizeHeader(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function toDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export default function ProgramPage() {
  const { tasks, projects, selectedProjectId, saveTasks } = useProjectTasks();
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const projectName = projects.find((project) => project.id === selectedProjectId)?.name ?? "Obra seleccionada";
  const projectTasks = tasks.filter((task) => task.projectId === selectedProjectId);

  const addTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim() || !form.milestoneName.trim()) return;
    const nextId = Math.max(0, ...tasks.map((task) => task.id)) + 1;
    const newTask: ProjectTask = {
      id: nextId,
      projectId: selectedProjectId,
      title: form.title.trim(),
      description: "",
      status: "todo",
      reviewStatus: "pending",
      milestoneId: `extra-${nextId}`,
      milestoneName: form.milestoneName.trim(),
      budgetedManHours: Number(form.budgetedManHours) || 0,
      supervisor: form.supervisor.trim(),
      scheduledDate: form.scheduledDate,
      taskType: form.taskType,
      activityLog: [],
    };
    saveTasks([...tasks, newTask]);
    setForm(emptyForm);
    setMessage("Tarea agregada al programa de la obra.");
  };

  const importProgram = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const [sheet] = await readXlsxFile(file);
      const [headerRow = [], ...dataRows] = sheet?.data ?? [];
      const headers = headerRow.map(normalizeHeader);
      const baseId = Math.max(0, ...tasks.map((task) => task.id)) + 1;
      const imported = dataRows.flatMap((cells, index) => {
        const row = Object.fromEntries(headers.map((header, columnIndex) => [header, cells[columnIndex] ?? ""]));
        const getValue = (aliases: string[]) => {
          const key = Object.keys(row).find((item) => aliases.includes(item));
          return key ? row[key] : "";
        };
        const title = String(getValue(["actividad", "tarea", "nombre", "nombre actividad"])).trim();
        if (!title) return [];
        const milestoneName = String(getValue(["hito", "partida", "fase"]) || "Sin hito").trim();
        const taskTypeText = normalizeHeader(getValue(["tipo", "origen", "clasificacion"]));
        return [{
          id: baseId + index,
          projectId: selectedProjectId,
          title,
          description: String(getValue(["descripcion", "detalle"]) || "").trim(),
          status: "todo" as const,
          reviewStatus: "pending" as const,
          milestoneId: `program-${normalizeHeader(milestoneName).replace(/\s+/g, "-")}`,
          milestoneName,
          budgetedManHours: Number(getValue(["hh presupuestadas", "horas hombre", "hh", "horas presupuestadas"])) || 0,
          supervisor: String(getValue(["supervisor", "responsable", "encargado"]) || "").trim(),
          scheduledDate: toDate(getValue(["fecha", "fecha programada", "dia"])),
          taskType: taskTypeText.includes("fuera") || taskTypeText.includes("extra") ? "out-of-program" as const : "scheduled" as const,
          activityLog: [],
        }];
      });
      if (imported.length === 0) {
        setMessage("No se encontraron actividades. Revisa que la primera fila tenga una columna Actividad o Tarea.");
      } else {
        saveTasks([...tasks, ...imported]);
        setMessage(`${imported.length} actividades importadas desde ${file.name}.`);
      }
    } catch {
      setMessage("No se pudo leer el archivo. Usa un libro XLSX válido.");
    }
    event.target.value = "";
  };

  return (
    <Box maxW="1300px" mx="auto" px={{ base: 4, md: 6, lg: 8 }} py={{ base: 5, md: 7 }}>
      <Box mb={6}>
        <Text fontSize="sm" color="#7A8694" mb={1}>{projectName}</Text>
        <Heading size="lg" color="#263238">Programa de obra</Heading>
        <Text mt={1} fontSize="sm" color="#7A8694">Importa actividades y asigna HH presupuestadas y supervisión.</Text>
      </Box>

      <Card.Root mb={5} border="1px solid" borderColor="#E8EDF3" borderRadius="8px" bg="white">
        <Card.Body p={{ base: 4, md: 6 }}>
          <Flex align="center" gap={2} mb={4}><FileUp size={18} color="#2F507F" /><Heading size="sm" color="#263238">Cargar programa Excel</Heading></Flex>
          <Text fontSize="sm" color="#7A8694" mb={4}>Columnas reconocidas: Actividad, Hito, HH presupuestadas, Supervisor, Fecha, Tipo y Descripción.</Text>
          <Input type="file" accept=".xlsx" onChange={importProgram} aria-label="Seleccionar programa Excel" />
        </Card.Body>
      </Card.Root>

      <Card.Root mb={6} border="1px solid" borderColor="#E8EDF3" borderRadius="8px" bg="white">
        <Card.Body p={{ base: 4, md: 6 }}>
          <Flex align="center" gap={2} mb={4}><Plus size={18} color="#2F507F" /><Heading size="sm" color="#263238">Agregar tarea al hito</Heading></Flex>
          <form onSubmit={addTask}>
            <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
              <Field.Root required><Field.Label>Actividad</Field.Label><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} borderColor="#DCE3EA" /></Field.Root>
              <Field.Root required><Field.Label>Hito o partida</Field.Label><Input value={form.milestoneName} onChange={(event) => setForm({ ...form, milestoneName: event.target.value })} borderColor="#DCE3EA" /></Field.Root>
              <Field.Root><Field.Label>HH presupuestadas</Field.Label><Input type="number" min={0} step="0.25" value={form.budgetedManHours} onChange={(event) => setForm({ ...form, budgetedManHours: event.target.value })} borderColor="#DCE3EA" /></Field.Root>
              <Field.Root><Field.Label>Supervisor a cargo</Field.Label><Input value={form.supervisor} onChange={(event) => setForm({ ...form, supervisor: event.target.value })} borderColor="#DCE3EA" /></Field.Root>
              <Field.Root><Field.Label>Fecha programada</Field.Label><Input type="date" value={form.scheduledDate} onChange={(event) => setForm({ ...form, scheduledDate: event.target.value })} borderColor="#DCE3EA" /></Field.Root>
              <Field.Root><Field.Label>Clasificación</Field.Label><select value={form.taskType} onChange={(event) => setForm({ ...form, taskType: event.target.value as ProgramTaskForm["taskType"] })} style={{ width: "100%", height: "40px", border: "1px solid #DCE3EA", borderRadius: "6px", padding: "0 12px", background: "white" }}><option value="scheduled">Programada</option><option value="out-of-program">Fuera del programa</option></select></Field.Root>
            </SimpleGrid>
            <Flex justify="flex-end" mt={4}><Button w={{ base: "full", sm: "auto" }} type="submit" bg="#2F507F" color="white"><Plus size={16} />Agregar tarea</Button></Flex>
          </form>
          {message && <Text mt={4} fontSize="sm" color="#2F507F" role="status">{message}</Text>}
        </Card.Body>
      </Card.Root>

      <Flex align="center" gap={2} mb={3}><Upload size={17} color="#2F507F" /><Heading size="sm" color="#263238">Actividades de la obra · {projectTasks.length}</Heading></Flex>
      <Flex direction="column" borderTop="1px solid #E8EDF3">{projectTasks.map((task) => <Flex key={task.id} justify="space-between" gap={4} align="center" py={3} borderBottom="1px solid #E8EDF3" wrap="wrap"><Box><Text fontSize="sm" fontWeight="700" color="#263238">{task.title}</Text><Text fontSize="xs" color="#7A8694">{task.milestoneName} · {task.supervisor || "Sin supervisor asignado"} · {task.scheduledDate || "Sin fecha"}</Text></Box><Flex align="center" gap={3}><Text fontSize="xs" color={task.taskType === "out-of-program" ? "#B42318" : "#52606B"}>{task.taskType === "out-of-program" ? "Fuera del programa" : "Programada"}</Text><Text fontSize="sm" fontWeight="700" color="#2F507F">{task.budgetedManHours ?? 0} HH</Text></Flex></Flex>)}</Flex>
    </Box>
  );
}