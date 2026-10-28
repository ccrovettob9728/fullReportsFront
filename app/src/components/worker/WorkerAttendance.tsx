"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, LogIn, LogOut } from "lucide-react";
import { Box, Button, Card, Flex, Heading, Input, Table, Text } from "@chakra-ui/react";
import { finishAppLoading, startAppLoading } from "../../lib/app-loading";
import { fetchWorkerWorkspace, workforceRequest, type WorkerWorkspace } from "../../lib/worker-api";

export default function WorkerAttendance() {
  const [workspace, setWorkspace] = useState<WorkerWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const reload = useCallback(async () => {
    try {
      setWorkspace(await fetchWorkerWorkspace());
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo cargar el historial.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void reload(); }, 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  const shifts = useMemo(
    () => (workspace?.shifts ?? []).filter((shift) => {
      const startedAt = new Date(shift.startedAt);
      const date = `${startedAt.getFullYear()}-${String(startedAt.getMonth() + 1).padStart(2, "0")}-${String(startedAt.getDate()).padStart(2, "0")}`;
      return (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
    }),
    [workspace?.shifts, fromDate, toDate],
  );

  const updateShift = async () => {
    if (!workspace?.project) return;
    setBusy(true);
    setError("");
    startAppLoading();
    try {
      await workforceRequest(
        "/api/worker/shifts",
        workspace.activeShift
          ? { method: "DELETE" }
          : { method: "POST", body: JSON.stringify({ projectId: workspace.project.id }) },
      );
      await reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo registrar el turno.");
    } finally {
      finishAppLoading();
      setBusy(false);
    }
  };

  if (loading) {
    return <Box px={6} py={10}><Text color="#7A8694">Cargando asistencia...</Text></Box>;
  }

  return (
    <Box maxW="1400px" mx="auto" px={{ base: 4, md: 6, lg: 8 }} py={{ base: 5, md: 7 }}>
      <Box mb={6}>
        <Text fontSize="sm" color="#7A8694" mb={1}>{workspace?.project?.name ?? "Mi obra"}</Text>
        <Heading size="lg" color="#263238">Asistencia y turnos</Heading>
        <Text mt={1} fontSize="sm" color="#7A8694">Registra tu ingreso y salida; consulta el historial de horas de tu jornada.</Text>
      </Box>

      {error && <Text mb={4} color="#B42318" role="alert">{error}</Text>}

      <Card.Root mb={5} border="1px solid #E8EDF3" borderRadius="16px" bg="white">
        <Card.Body p={{ base: 4, md: 6 }}>
          <Flex direction={{ base: "column", sm: "row" }} align={{ base: "stretch", sm: "center" }} justify="space-between" gap={4}>
            <Box>
              <Flex align="center" gap={2}>
                <Clock3 size={18} color="#2F507F" />
                <Heading size="sm" color="#263238">{workspace?.activeShift ? "Turno en curso" : "Sin turno activo"}</Heading>
              </Flex>
              <Text mt={2} fontSize="sm" color="#7A8694">
                {workspace?.activeShift
                  ? `Ingreso: ${new Date(workspace.activeShift.startedAt).toLocaleString("es-CL")}`
                  : workspace?.project ? "Marca tu ingreso al comenzar la jornada." : "Aún no tienes una obra asignada."}
              </Text>
            </Box>
            <Button
              minH="48px"
              w={{ base: "full", sm: "auto" }}
              bg={workspace?.activeShift ? "#B42318" : "#2E9B6F"}
              color="white"
              onClick={updateShift}
              disabled={busy || !workspace?.project || (Boolean(workspace.activeActivity) && Boolean(workspace.activeShift))}
            >
              {workspace?.activeShift ? <LogOut size={18} /> : <LogIn size={18} />}
              {busy ? "Guardando..." : workspace?.activeShift ? "Registrar salida" : "Registrar ingreso"}
            </Button>
          </Flex>
          {workspace?.activeActivity && <Text mt={3} fontSize="sm" color="#7A8694">Finaliza la actividad en curso antes de cerrar tu turno.</Text>}
        </Card.Body>
      </Card.Root>

      <Flex align="center" gap={2} mb={3}>
        <CalendarDays size={17} color="#2F507F" />
        <Heading size="sm" color="#263238">Historial de turnos</Heading>
        <Text fontSize="xs" color="#7A8694">{shifts.length} registros</Text>
      </Flex>
      <Flex direction={{ base: "column", sm: "row" }} gap={3} mb={4}>
        <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} aria-label="Desde fecha" w={{ base: "full", sm: "180px" }} borderColor="#DCE3EA" />
        <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} aria-label="Hasta fecha" w={{ base: "full", sm: "180px" }} borderColor="#DCE3EA" />
      </Flex>
      <Box border="1px solid #E8EDF3" borderRadius="12px" bg="white" overflow="hidden">
        {shifts.length ? (
          <Box overflowX="auto">
            <Table.Root minW="620px" size="sm">
              <Table.Header bg="#F8FAFC"><Table.Row><Table.ColumnHeader>Fecha</Table.ColumnHeader><Table.ColumnHeader>Ingreso</Table.ColumnHeader><Table.ColumnHeader>Salida</Table.ColumnHeader><Table.ColumnHeader>Horas</Table.ColumnHeader></Table.Row></Table.Header>
              <Table.Body>
                {shifts.map((shift) => (
                  <Table.Row key={shift.id}>
                    <Table.Cell>{new Date(shift.startedAt).toLocaleDateString("es-CL")}</Table.Cell>
                    <Table.Cell>{new Date(shift.startedAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</Table.Cell>
                    <Table.Cell>{new Date(shift.endedAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</Table.Cell>
                    <Table.Cell fontWeight="600">{(shift.durationSeconds / 3600).toLocaleString("es-CL", { maximumFractionDigits: 2 })} h</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        ) : (
          <Text px={5} py={10} textAlign="center" fontSize="sm" color="#7A8694">Todavía no hay turnos finalizados para estas fechas.</Text>
        )}
      </Box>
    </Box>
  );
}
