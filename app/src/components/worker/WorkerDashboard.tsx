"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, CalendarCheck, Clock3, LogIn, LogOut } from "lucide-react";
import { Box, Button, Card, Flex, Heading, SimpleGrid, Text } from "@chakra-ui/react";
import { fetchWorkerWorkspace, workforceRequest, type WorkerWorkspace } from "../../lib/worker-api";
import { finishAppLoading, startAppLoading } from "../../lib/app-loading";

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function weekdayCount(startDate: string, endDate: Date) {
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 0;
  const current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  let count = 0;
  while (current <= end) {
    if (current.getDay() !== 0 && current.getDay() !== 6) count += 1;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

function formatHours(seconds: number) {
  return `${(seconds / 3600).toLocaleString("es-CL", { maximumFractionDigits: 1 })} h`;
}

export default function WorkerDashboard() {
  const [workspace, setWorkspace] = useState<WorkerWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);

  const reload = useCallback(async () => {
    try {
      setWorkspace(await fetchWorkerWorkspace());
      setError("");
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo cargar tu panel.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => { void reload(); }, 0);
    const clockTimer = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      window.clearTimeout(loadTimer);
      window.clearTimeout(clockTimer);
      window.clearInterval(timer);
    };
  }, [reload]);

  const completedSeconds = useMemo(
    () => (workspace?.shifts ?? []).reduce((total, shift) => total + shift.durationSeconds, 0),
    [workspace?.shifts],
  );
  const workedSeconds = completedSeconds + (
    workspace?.activeShift ? Math.max(0, Math.floor((now - Date.parse(workspace.activeShift.startedAt)) / 1000)) : 0
  );
  const attendance = useMemo(() => {
    if (!workspace?.project) return 0;
    const firstShift = [...workspace.shifts]
      .sort((left, right) => left.startedAt.localeCompare(right.startedAt))[0];
    const startDate = workspace.project.startDate ?? (
      firstShift
        ? localDateKey(new Date(firstShift.startedAt))
        : workspace.activeShift ? localDateKey(new Date(workspace.activeShift.startedAt)) : ""
    );
    if (!startDate) return 0;
    const totalDays = weekdayCount(startDate, new Date(now));
    if (!totalDays) return 0;
    const attendedDays = new Set(workspace.shifts.map((shift) => localDateKey(new Date(shift.startedAt))));
    if (workspace.activeShift) attendedDays.add(localDateKey(new Date(workspace.activeShift.startedAt)));
    return Math.min(100, Math.round((attendedDays.size / totalDays) * 100));
  }, [workspace, now]);

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
    return <Box px={6} py={10}><Text color="#7A8694">Cargando tu panel...</Text></Box>;
  }

  if (!workspace?.project) {
    return (
      <Box maxW="1000px" mx="auto" px={{ base: 4, md: 6 }} py={{ base: 6, md: 10 }}>
        <Card.Root border="1px solid #E8EDF3" borderRadius="18px" bg="white">
          <Card.Body p={{ base: 5, md: 8 }}>
            <Heading size="lg" color="#263238">Aún no tienes una obra asignada</Heading>
            <Text mt={3} color="#7A8694">Cuando administración te asigne a un proyecto, aquí verás tu resumen de asistencia y horas.</Text>
            {error && <Text mt={4} color="#B42318" role="alert">{error}</Text>}
          </Card.Body>
        </Card.Root>
      </Box>
    );
  }

  const stats = [
    { title: "Horas-hombre", value: formatHours(workedSeconds), description: "Horas reales registradas en tus turnos", icon: Clock3 },
    { title: "Asistencia", value: `${attendance}%`, description: "Días con turno / días hábiles desde el inicio", icon: CalendarCheck },
    { title: "Actividad actual", value: workspace.activeActivity?.taskTitle ?? "Sin actividad", description: workspace.activeActivity ? "En curso" : "Inicia una actividad cuando marques tu ingreso", icon: Activity },
  ];

  return (
    <Box maxW="1500px" mx="auto" px={{ base: 4, md: 6, lg: 8 }} py={{ base: 5, md: 7 }}>
      <Flex direction={{ base: "column", md: "row" }} justify="space-between" align={{ base: "stretch", md: "flex-start" }} gap={4} mb={6}>
        <Box>
          <Text fontSize="sm" color="#7A8694" mb={1}>{workspace.project.name}</Text>
          <Heading size="lg" color="#263238">Mi jornada</Heading>
          <Text mt={1} fontSize="sm" color="#7A8694">Registra tus turnos y revisa el avance de tu jornada.</Text>
        </Box>
        <Button
          w={{ base: "full", md: "auto" }}
          minH="48px"
          bg={workspace.activeShift ? "#B42318" : "#2E9B6F"}
          color="white"
          onClick={updateShift}
          disabled={busy || (Boolean(workspace.activeActivity) && Boolean(workspace.activeShift))}
          _hover={{ opacity: 0.9 }}
        >
          {workspace.activeShift ? <LogOut size={18} /> : <LogIn size={18} />}
          {busy ? "Guardando..." : workspace.activeShift ? "Registrar salida" : "Registrar ingreso"}
        </Button>
      </Flex>

      {error && <Text mb={4} color="#B42318" role="alert">{error}</Text>}

      <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} mb={5}>
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card.Root key={stat.title} border="1px solid #E8EDF3" borderRadius="16px" bg="white">
              <Card.Body p={5}>
                <Flex align="center" gap={3}>
                  <Box w="42px" h="42px" display="grid" placeItems="center" borderRadius="12px" bg="#E8EEF7" color="#2F507F"><Icon size={20} /></Box>
                  <Box minW="0">
                    <Text fontSize="sm" color="#7A8694">{stat.title}</Text>
                    <Text fontSize="xl" fontWeight="700" color="#263238" overflowWrap="anywhere">{stat.value}</Text>
                  </Box>
                </Flex>
                <Text mt={3} fontSize="xs" color="#7A8694">{stat.description}</Text>
              </Card.Body>
            </Card.Root>
          );
        })}
      </SimpleGrid>

      <Card.Root border="1px solid #E8EDF3" borderRadius="16px" bg="white" mb={5}>
        <Card.Body p={{ base: 4, md: 6 }}>
          <Flex direction={{ base: "column", sm: "row" }} justify="space-between" align={{ base: "flex-start", sm: "center" }} gap={4}>
            <Box>
              <Heading size="sm" color="#263238">Estado del turno</Heading>
              <Text mt={1} fontSize="sm" color="#7A8694">
                {workspace.activeShift
                  ? `Ingreso registrado ${new Date(workspace.activeShift.startedAt).toLocaleString("es-CL")}`
                  : "Todavía no has iniciado un turno."}
              </Text>
            </Box>
            <Link href="/actividades" style={{ textDecoration: "none" }}>
              <Button variant="outline" borderColor="#2F507F" color="#2F507F" w={{ base: "full", sm: "auto" }}>
                Ver actividades
              </Button>
            </Link>
          </Flex>
          {workspace.activeActivity && (
            <Text mt={3} fontSize="sm" color="#2F507F">
              Finaliza “{workspace.activeActivity.taskTitle}” antes de cerrar tu turno.
            </Text>
          )}
        </Card.Body>
      </Card.Root>

      <Card.Root border="1px solid #E8EDF3" borderRadius="16px" bg="white">
        <Card.Body p={{ base: 4, md: 6 }}>
          <Heading size="sm" color="#263238" mb={3}>Actividades pendientes</Heading>
          {workspace.tasks.filter((task) => task.status !== "done").length ? (
            workspace.tasks.filter((task) => task.status !== "done").slice(0, 5).map((task) => (
              <Flex key={task.id} justify="space-between" gap={3} py={2} borderBottom="1px solid #EEF1F4">
                <Text fontSize="sm" color="#36434F">{task.title}</Text>
                <Text fontSize="xs" color="#7A8694" flexShrink={0}>{task.milestoneName}</Text>
              </Flex>
            ))
          ) : (
            <Text fontSize="sm" color="#7A8694">No hay actividades pendientes para tu obra.</Text>
          )}
        </Card.Body>
      </Card.Root>
    </Box>
  );
}
