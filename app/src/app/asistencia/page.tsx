"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import readXlsxFile from "read-excel-file/browser";
import { CalendarDays, FileUp, Search, Users } from "lucide-react";
import { Box, Card, Flex, Heading, Input, Table, Text } from "@chakra-ui/react";
import { readAttendance, saveAttendance, type AttendanceRecord, useProjectTasks } from "../../data/workspace";

function normalize(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function parseDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function hoursBetween(start: unknown, end: unknown) {
  const toMinutes = (value: unknown) => {
    const match = String(value).match(/(\d{1,2}):(\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  };
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  if (startMinutes === null || endMinutes === null) return 0;
  const duration = endMinutes >= startMinutes ? endMinutes - startMinutes : endMinutes + 1440 - startMinutes;
  return Math.round((duration / 60) * 100) / 100;
}

export default function AttendancePage() {
  const { projects, selectedProjectId } = useProjectTasks();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [message, setMessage] = useState("");
  const projectName = projects.find((project) => project.id === selectedProjectId)?.name ?? "Obra seleccionada";

  useEffect(() => {
    const timeout = window.setTimeout(() => setRecords(readAttendance()), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const filteredRecords = useMemo(() => {
    const search = query.trim().toLowerCase();
    return records.filter((record) => record.projectId === selectedProjectId).filter((record) => {
      const matchesSearch = !search || `${record.name} ${record.employeeId} ${record.status}`.toLowerCase().includes(search);
      return matchesSearch && (!fromDate || record.date >= fromDate) && (!toDate || record.date <= toDate);
    }).sort((left, right) => right.date.localeCompare(left.date));
  }, [records, query, fromDate, toDate, selectedProjectId]);

  const importAttendance = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const [sheet] = await readXlsxFile(file);
      const [headerRow = [], ...dataRows] = sheet?.data ?? [];
      const headers = headerRow.map(normalize);
      const imported = dataRows.flatMap((cells, index) => {
        const row = Object.fromEntries(headers.map((header, columnIndex) => [header, cells[columnIndex] ?? ""]));
        const cell = (aliases: string[]) => {
          const key = Object.keys(row).find((header) => aliases.includes(header));
          return key ? row[key] : "";
        };
        const date = parseDate(cell(["fecha", "dia", "fecha asistencia"]));
        const name = String(cell(["nombre", "trabajador", "colaborador", "persona"])).trim();
        if (!date || !name) return [];
        const suppliedHours = Number(cell(["horas", "hh", "horas trabajadas"]));
        const computedHours = hoursBetween(cell(["entrada", "hora entrada"]), cell(["salida", "hora salida"]));
        return [{
          id: `${Date.now()}-${index}`,
          projectId: selectedProjectId,
          name,
          date,
          employeeId: String(cell(["rut", "id", "identificacion", "codigo trabajador"])).trim(),
          status: String(cell(["estado", "asistencia", "marca"]) || "Registrada").trim(),
          hours: suppliedHours || computedHours,
          source: file.name,
          importedAt: new Date().toISOString(),
        } satisfies AttendanceRecord];
      });
      if (!imported.length) {
        setMessage("No se encontraron filas válidas. Se requieren al menos las columnas Fecha y Nombre/Trabajador.");
      } else {
        const nextRecords = [...records, ...imported];
        saveAttendance(nextRecords);
        setRecords(nextRecords);
        setMessage(`${imported.length} registros agregados al historial.`);
      }
    } catch {
      setMessage("No se pudo leer el archivo. Usa un libro XLSX válido.");
    }
    event.target.value = "";
  };

  return (
    <Box maxW="1400px" mx="auto" px={{ base: 4, md: 6, lg: 8 }} py={{ base: 5, md: 7 }}>
      <Box mb={6}>
        <Text fontSize="sm" color="#7A8694" mb={1}>{projectName}</Text>
        <Heading size="lg" color="#263238">Asistencia histórica</Heading>
        <Text mt={1} fontSize="sm" color="#7A8694">Registros importados por el área de relaciones laborales.</Text>
      </Box>

      <Card.Root mb={5} border="1px solid" borderColor="#E8EDF3" borderRadius="8px" bg="white">
        <Card.Body p={{ base: 4, md: 6 }}>
          <Flex align="center" gap={2} mb={3}><FileUp size={18} color="#2F507F" /><Heading size="sm" color="#263238">Importar asistencia</Heading></Flex>
          <Text fontSize="sm" color="#7A8694" mb={4}>Formato XLSX con Fecha, Nombre, RUT/ID, Estado y Horas o Entrada/Salida.</Text>
          <Input type="file" accept=".xlsx" onChange={importAttendance} aria-label="Seleccionar Excel de asistencia" />
          {message && <Text mt={3} fontSize="sm" color="#2F507F" role="status">{message}</Text>}
        </Card.Body>
      </Card.Root>

      <Flex align="center" gap={2} mb={3}><CalendarDays size={17} color="#2F507F" /><Heading size="sm" color="#263238">Historial</Heading><Text fontSize="xs" color="#7A8694">{filteredRecords.length} registros</Text></Flex>
      <Flex gap={3} wrap="wrap" mb={4}>
        <Box position="relative" flex={{ base: "1 1 100%", sm: "1 1 220px" }} minW="0"><Search size={16} color="#7A8694" style={{ position: "absolute", left: 12, top: 12, zIndex: 1 }} /><Input pl="38px" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar trabajador o RUT" aria-label="Buscar trabajador" borderColor="#DCE3EA" /></Box>
        <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} aria-label="Desde fecha" w={{ base: "full", sm: "180px" }} maxW="100%" borderColor="#DCE3EA" />
        <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} aria-label="Hasta fecha" w={{ base: "full", sm: "180px" }} maxW="100%" borderColor="#DCE3EA" />
      </Flex>
      <Box border="1px solid #E8EDF3" borderRadius="8px" bg="white" overflow="hidden">
        {filteredRecords.length ? <Box overflowX="auto"><Table.Root minW="720px" size="sm"><Table.Header bg="#F8FAFC"><Table.Row><Table.ColumnHeader>Fecha</Table.ColumnHeader><Table.ColumnHeader>Trabajador</Table.ColumnHeader><Table.ColumnHeader>RUT / ID</Table.ColumnHeader><Table.ColumnHeader>Estado</Table.ColumnHeader><Table.ColumnHeader>Horas</Table.ColumnHeader><Table.ColumnHeader>Archivo</Table.ColumnHeader></Table.Row></Table.Header><Table.Body>{filteredRecords.map((record) => <Table.Row key={record.id}><Table.Cell>{record.date}</Table.Cell><Table.Cell fontWeight="600">{record.name}</Table.Cell><Table.Cell>{record.employeeId || "-"}</Table.Cell><Table.Cell>{record.status}</Table.Cell><Table.Cell>{record.hours || "-"}</Table.Cell><Table.Cell>{record.source}</Table.Cell></Table.Row>)}</Table.Body></Table.Root></Box> : <Flex direction="column" align="center" py={12} color="#7A8694"><Users size={25} /><Text mt={3} fontSize="sm">No hay registros para los filtros seleccionados.</Text></Flex>}
      </Box>
    </Box>
  );
}