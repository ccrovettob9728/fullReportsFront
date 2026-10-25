"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import readXlsxFile from "read-excel-file/browser";
import { ArrowRight, FileText, FileUp, Image as ImageIcon, ListFilter, Search } from "lucide-react";
import {
  Box,
  Card,
  Flex,
  Heading,
  Input,
  Table,
  Text,
} from "@chakra-ui/react";
import { taskStatusColors, taskStatusLabels, type ProjectTask, type TaskStatus } from "../../data/tasks";
import { readAttendance, saveAttendance, type AttendanceRecord, useProjectTasks } from "../../data/workspace";

const activityHeaders = ["actividad", "tarea", "nombre actividad", "actividad realizada", "actividad ejecutada", "trabajo realizado", "labor", "faena", "partida"];
const dateHeaders = ["fecha", "dia", "fecha reporte", "fecha actividad"];
const statusHeaders = ["estado", "status", "avance", "situacion"];
const hoursHeaders = ["hh reales", "hh ejecutadas", "horas hombre", "horas trabajadas", "hh", "horas"];
const workerHeaders = ["trabajadores", "personas", "cantidad trabajadores", "dotacion", "cuadrilla"];
const supervisorHeaders = ["supervisor", "responsable", "encargado"];
const milestoneHeaders = ["hito", "fase", "frente", "sector"];
const noteHeaders = ["observacion", "observaciones", "comentario", "detalle", "descripcion", "incidencia"];
const attendanceNameHeaders = ["nombre", "nombre completo", "trabajador", "colaborador", "persona", "empleado", "personal"];
const attendanceDateHeaders = ["fecha", "dia", "fecha asistencia", "fecha reporte"];
const attendanceIdHeaders = ["rut", "id", "identificacion", "codigo trabajador", "documento"];
const attendanceStatusHeaders = ["asistencia", "marca", "estado", "status"];
const attendanceHoursHeaders = ["horas", "hh", "horas trabajadas"];
const attendanceEntryHeaders = ["entrada", "hora entrada", "ingreso"];
const attendanceExitHeaders = ["salida", "hora salida", "egreso"];

function normalize(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function getCell(row: Record<string, unknown>, aliases: string[]) {
  const key = Object.keys(row).find((header) => aliases.includes(normalize(header)));
  return key ? row[key] : "";
}

function parseReportDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }
  if (typeof value === "number") {
    const date = new Date(Date.UTC(1899, 11, 30) + value * 86_400_000);
    return date.toISOString().slice(0, 10);
  }
  const text = String(value ?? "").trim();
  const localDate = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (localDate) {
    const [, day, month, rawYear] = localDate;
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function parseNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const text = String(value ?? "").trim().replace(/\s/g, "");
  if (!text) return 0;
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function parseStatus(value: unknown): TaskStatus | undefined {
  const status = normalize(value);
  if (!status) return undefined;
  if (["hecha", "hecho", "completada", "completado", "finalizada", "finalizado", "terminada", "terminado", "ejecutada", "ejecutado", "realizada", "realizado"].some((word) => status.includes(word))) return "done";
  if (["pendiente", "por hacer", "no iniciada", "no iniciado", "programada"].some((word) => status.includes(word))) return "todo";
  if (["progreso", "proceso", "ejecucion", "iniciada", "iniciado", "en curso", "en terreno"].some((word) => status.includes(word))) return "in-progress";
  return undefined;
}

function findHeaderRow(rows: unknown[][], requiredHeaders: string[], supportingHeaders: string[] = []) {
  const limit = Math.min(rows.length, 20);
  for (let index = 0; index < limit; index += 1) {
    const headers = rows[index].map(normalize);
    if (requiredHeaders.some((header) => headers.includes(header)) && (!supportingHeaders.length || supportingHeaders.some((header) => headers.includes(header)))) return index;
  }
  return -1;
}

function getAttendanceHours(row: Record<string, unknown>) {
  const suppliedHours = parseNumber(getCell(row, attendanceHoursHeaders));
  if (suppliedHours) return suppliedHours;
  const toMinutes = (value: unknown) => {
    const match = String(value ?? "").match(/(\d{1,2}):(\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  };
  const start = toMinutes(getCell(row, attendanceEntryHeaders));
  const end = toMinutes(getCell(row, attendanceExitHeaders));
  if (start === null || end === null) return 0;
  return Math.round(((end >= start ? end - start : end + 1440 - start) / 60) * 100) / 100;
}

export default function TasksPage() {
  const [query, setQuery] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const { tasks, projects, selectedProjectId, saveTasks } = useProjectTasks();
  const projectTasks = tasks.filter((task) => task.projectId === selectedProjectId);
  const today = new Date().toLocaleDateString("en-CA");
  const todayTasks = projectTasks.filter((task) => task.status !== "done" && task.scheduledDate && task.scheduledDate <= today);
  const projectName = projects.find((project) => project.id === selectedProjectId)?.name ?? "Obra seleccionada";

  const normalizedQuery = query.trim().toLowerCase();
  const filteredTasks = projectTasks.filter((task) =>
    !normalizedQuery ||
      [task.title, task.description, task.milestoneName, taskStatusLabels[task.status]]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
  );

  const importDailyReport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const sheets = await readXlsxFile(file);
      const nextTasks = [...tasks];
      let nextId = Math.max(Date.now(), ...tasks.map((task) => task.id + 1));
      const existingAttendance = readAttendance();
      const importedAttendance: AttendanceRecord[] = [];
      let created = 0;
      let updated = 0;
      let skipped = 0;
      let attendanceSkipped = 0;
      let taskSheets = 0;
      let attendanceSheets = 0;

      for (const sheet of sheets) {
        const taskHeaderIndex = findHeaderRow(sheet.data, activityHeaders);
        const attendanceHeaderIndex = findHeaderRow(sheet.data, attendanceNameHeaders, attendanceDateHeaders);

        if (taskHeaderIndex >= 0) {
          taskSheets += 1;
          const headers = sheet.data[taskHeaderIndex].map((header) => String(header ?? "").trim());
          sheet.data.slice(taskHeaderIndex + 1).forEach((cells) => {
            const row = Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex] ?? ""])) as Record<string, unknown>;
            const title = String(getCell(row, activityHeaders)).trim();
            if (!title) return;

            const date = parseReportDate(getCell(row, dateHeaders));
            const hours = parseNumber(getCell(row, hoursHeaders));
            const workers = parseNumber(getCell(row, workerHeaders));
            const status = parseStatus(getCell(row, statusHeaders));
            const observation = String(getCell(row, noteHeaders) ?? "").trim();
            const supervisor = String(getCell(row, supervisorHeaders) ?? "").trim();
            const milestoneName = String(getCell(row, milestoneHeaders) || sheet.sheet || "Reporte diario").trim();
            const details = [status ? taskStatusLabels[status] : "Avance reportado", hours ? `${hours} HH` : "", workers ? `${workers} personas` : "", supervisor, observation].filter(Boolean).join(" · ");
            const logDescription = `Reporte diario ${date || "sin fecha"} · ${file.name} · ${sheet.sheet} · ${details || title}`;
            const normalizedTitle = normalize(title);
            const taskIndex = nextTasks.findIndex((task) => task.projectId === selectedProjectId && normalize(task.title) === normalizedTitle);
            const matchedTask = taskIndex >= 0 ? nextTasks[taskIndex] : undefined;

            if (matchedTask?.activityLog?.some((entry) => entry.description === logDescription)) {
              skipped += 1;
              return;
            }

            const activityLog = [...(matchedTask?.activityLog ?? []), { at: new Date().toISOString(), description: logDescription }];
            if (matchedTask && taskIndex >= 0) {
              nextTasks[taskIndex] = {
                ...matchedTask,
                status: status ?? matchedTask.status,
                actualManHours: matchedTask.actualManHours !== undefined ? matchedTask.actualManHours + hours : hours || matchedTask.actualManHours,
                workersCount: workers || matchedTask.workersCount,
                supervisor: supervisor || matchedTask.supervisor,
                scheduledDate: matchedTask.scheduledDate || date,
                completedAt: status === "done" ? `${date || new Date().toISOString().slice(0, 10)}T12:00:00.000Z` : matchedTask.completedAt,
                activityLog,
              };
              updated += 1;
              return;
            }

            const newTask: ProjectTask = {
              id: nextId++,
              projectId: selectedProjectId,
              title,
              description: observation,
              status: status ?? "in-progress",
              reviewStatus: "pending",
              milestoneId: `report-${normalize(milestoneName).replace(/\s+/g, "-")}`,
              milestoneName,
              actualManHours: hours,
              workersCount: workers || undefined,
              supervisor: supervisor || undefined,
              taskType: "out-of-program",
              scheduledDate: date,
              completedAt: status === "done" ? `${date || new Date().toISOString().slice(0, 10)}T12:00:00.000Z` : undefined,
              activityLog: [{ at: new Date().toISOString(), description: logDescription }],
            };
            nextTasks.push(newTask);
            created += 1;
          });
        }

        if (attendanceHeaderIndex >= 0) {
          attendanceSheets += 1;
          const headers = sheet.data[attendanceHeaderIndex].map((header) => String(header ?? "").trim());
          sheet.data.slice(attendanceHeaderIndex + 1).forEach((cells, index) => {
            const row = Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex] ?? ""])) as Record<string, unknown>;
            const date = parseReportDate(getCell(row, attendanceDateHeaders));
            const name = String(getCell(row, attendanceNameHeaders)).trim();
            if (!date || !name) return;
            const employeeId = String(getCell(row, attendanceIdHeaders)).trim();
            const status = String(getCell(row, attendanceStatusHeaders) || "Registrada").trim();
            const duplicate = [...existingAttendance, ...importedAttendance].some((record) =>
              record.projectId === selectedProjectId && record.date === date && record.source === file.name &&
              (employeeId ? record.employeeId === employeeId : normalize(record.name) === normalize(name))
            );
            if (duplicate) {
              attendanceSkipped += 1;
              return;
            }
            importedAttendance.push({
              id: `${Date.now()}-${sheet.sheet}-${index}`,
              projectId: selectedProjectId,
              employeeId,
              name,
              date,
              status,
              hours: getAttendanceHours(row),
              source: file.name,
              importedAt: new Date().toISOString(),
            });
          });
        }
      }

      if (created + updated > 0) saveTasks(nextTasks);
      if (importedAttendance.length) saveAttendance([...existingAttendance, ...importedAttendance]);
      if (!taskSheets && !attendanceSheets) {
        setImportMessage("No se encontraron encabezados de tareas ni de asistencia en las hojas del Excel.");
        return;
      }
      const attendanceMessage = `${importedAttendance.length} asistencias nuevas${attendanceSkipped ? ` (${attendanceSkipped} duplicadas omitidas)` : ""}`;
      setImportMessage(`${created} tareas nuevas, ${updated} actualizadas${skipped ? ` y ${skipped} filas duplicadas omitidas` : ""}; ${attendanceMessage}. Hojas revisadas: ${sheets.length}.`);
    } catch {
      setImportMessage("No se pudo leer el archivo. Selecciona un Excel XLSX válido.");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <Box maxW="1600px" mx="auto" px={{ base: 4, md: 6, lg: 8 }} py={{ base: 5, md: 7 }}>
      <Box mb={6}>
        <Text fontSize="sm" color="#7A8694" mb={1}>{projectName}</Text>
        <Heading size="lg" color="#263238">Tareas del proyecto</Heading>
        <Text mt={1} fontSize="sm" color="#7A8694">Busca y revisa todas las tareas de la obra.</Text>
      </Box>

      <Card.Root mb={5} border="1px solid" borderColor="#E8EDF3" borderRadius="8px" bg="white">
        <Card.Body p={{ base: 4, md: 5 }}>
          <Flex align="center" gap={2} mb={2}><FileUp size={18} color="#2F507F" /><Heading size="sm" color="#263238">Cargar reporte diario</Heading></Flex>
          <Text fontSize="sm" color="#7A8694" mb={4}>Lee todas las hojas del Excel en este dispositivo. Importa tareas y dotación desde hojas de actividades, y asistencia desde hojas con Fecha, Nombre y Estado/Horas. Los datos quedan solo en este navegador.</Text>
          <Input type="file" accept=".xlsx" onChange={importDailyReport} aria-label="Seleccionar reporte diario Excel" />
          {importMessage && <Text mt={3} fontSize="sm" color="#2F507F" role="status">{importMessage}</Text>}
        </Card.Body>
      </Card.Root>

      <Box mb={5} p={{ base: 4, md: 5 }} bg="#FFF8E8" borderLeft="4px solid #B18419" borderRadius="4px">
        <Flex align="center" justify="space-between" gap={3} wrap="wrap">
          <Box>
            <Heading size="sm" color="#263238">Tareas faltantes del día</Heading>
            <Text mt={1} fontSize="sm" color="#7A8694">Pendientes programados para hoy o con fecha vencida.</Text>
          </Box>
          <Text fontSize="sm" fontWeight="700" color="#8A6412">{todayTasks.length} pendiente{todayTasks.length === 1 ? "" : "s"}</Text>
        </Flex>
        {todayTasks.length > 0 && <Flex direction="column" mt={3} borderTop="1px solid #F0D58A">{todayTasks.map((task) => <Link key={task.id} href={`/tareas/${task.id}`} style={{ textDecoration: "none" }}><Flex justify="space-between" gap={3} py={2} borderBottom="1px solid #F0D58A"><Text fontSize="sm" color="#263238">{task.title}</Text><Text fontSize="xs" color="#7A8694">{task.scheduledDate}</Text></Flex></Link>)}</Flex>}
      </Box>

      <Card.Root border="1px solid" borderColor="#E8EDF3" borderRadius="16px" bg="white" mb={5}>
        <Card.Body p={{ base: 4, md: 6 }}>
          <Flex align="center" gap={2} mb={3}>
            <Search size={18} color="#2F507F" />
            <Text fontSize="sm" fontWeight="700" color="#263238">Buscar tareas</Text>
          </Flex>
          <Box position="relative">
            <Search size={20} color="#8A96A3" style={{ position: "absolute", left: 16, top: 16, zIndex: 1 }} />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Busca por nombre, hito, estado o descripción..."
              aria-label="Buscar tareas"
              h="54px"
              pl="48px"
              fontSize="md"
              borderColor="#DCE3EA"
              borderRadius="10px"
              _focus={{ borderColor: "#2F507F", boxShadow: "0 0 0 1px #2F507F" }}
            />
          </Box>
        </Card.Body>
      </Card.Root>

      <Card.Root border="1px solid" borderColor="#E8EDF3" borderRadius="16px" bg="white" overflow="hidden">
        <Card.Header borderBottom="1px solid" borderColor="#E8EDF3" px={{ base: 4, md: 6 }} py={4}>
          <Flex align="center" justify="space-between" gap={3}>
            <Flex align="center" gap={2}>
              <ListFilter size={18} color="#2F507F" />
              <Heading size="sm" color="#263238">Todas las tareas</Heading>
            </Flex>
            <Text fontSize="xs" color="#7A8694">{filteredTasks.length} resultados</Text>
          </Flex>
        </Card.Header>

        <Box overflowX="auto">
          <Table.Root variant="line" size="md" minW="760px">
            <Table.Header bg="#F8FAFC">
              <Table.Row>
                <Table.ColumnHeader color="#7A8694" fontSize="xs">Tarea</Table.ColumnHeader>
                <Table.ColumnHeader color="#7A8694" fontSize="xs">Hito</Table.ColumnHeader>
                <Table.ColumnHeader color="#7A8694" fontSize="xs">Estado</Table.ColumnHeader>
                <Table.ColumnHeader color="#7A8694" fontSize="xs">Adjuntos</Table.ColumnHeader>
                <Table.ColumnHeader aria-label="Abrir tarea" />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredTasks.map((task) => (
                <Table.Row key={task.id} _hover={{ bg: "#FAFCFE" }}>
                  <Table.Cell>
                    <Link href={`/tareas/${task.id}`} style={{ textDecoration: "none" }}>
                      <Text fontSize="sm" fontWeight="700" color="#263238">{task.title}</Text>
                      <Text mt={1} fontSize="xs" color="#7A8694">TASK-{String(task.id).padStart(3, "0")} · {task.description}</Text>
                    </Link>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm" color="#52606B">{task.milestoneName}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text display="inline-block" fontSize="xs" fontWeight="700" color={taskStatusColors[task.status]} bg={`${taskStatusColors[task.status]}18`} borderRadius="full" px={3} py={1}>{taskStatusLabels[task.status]}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Flex align="center" gap={2} color="#7A8694">
                      {task.imageUrl && <ImageIcon size={15} aria-label="Tiene imagen" />}
                      {task.documentUrl && <FileText size={15} aria-label="Tiene documento" />}
                      {!task.imageUrl && !task.documentUrl && <Text fontSize="xs">Sin adjuntos</Text>}
                    </Flex>
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <Link href={`/tareas/${task.id}`} aria-label={`Abrir ${task.title}`}>
                      <ArrowRight size={17} color="#2F507F" />
                    </Link>
                  </Table.Cell>
                </Table.Row>
              ))}
              {filteredTasks.length === 0 && (
                <Table.Row>
                  <Table.Cell colSpan={5} textAlign="center" py={12}>
                    <Text color="#7A8694">No encontramos tareas con esa búsqueda.</Text>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table.Root>
        </Box>
      </Card.Root>
    </Box>
  );
}
