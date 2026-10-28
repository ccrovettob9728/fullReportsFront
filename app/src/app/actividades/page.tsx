"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Activity, CheckCircle2, Clock3, Wrench } from "lucide-react";
import { Box, Button, Card, Field, Flex, Heading, SimpleGrid, Text, Textarea } from "@chakra-ui/react";
import type { WorkerActivity } from "../../types/workforce";
import { finishAppLoading, startAppLoading } from "../../lib/app-loading";
import { fetchWorkerWorkspace, workforceRequest, type WorkerWorkspace } from "../../lib/worker-api";

function elapsedLabel(startedAt: string, now: number) {
  const seconds = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export default function ActivitiesPage() {
  const [workspace, setWorkspace] = useState<WorkerWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [taskId, setTaskId] = useState("");
  const [machineId, setMachineId] = useState("");
  const [comment, setComment] = useState("");
  const [now, setNow] = useState(0);

  const reload = useCallback(async () => {
    try {
      const data = await fetchWorkerWorkspace();
      setWorkspace(data);
      setTaskId((current) => current || String(data.tasks.find((task) => task.status !== "done")?.id ?? ""));
      setMachineId((current) => current || "");
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudieron cargar las actividades.");
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

  const availableTasks = useMemo(
    () => (workspace?.tasks ?? []).filter((task) => task.status !== "done"),
    [workspace?.tasks],
  );

  const submitActivity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!workspace?.project || !taskId) return;
    setBusy(true);
    setError("");
    startAppLoading();
    try {
      await workforceRequest<{ activity: WorkerActivity }>("/api/worker/activities", {
        method: "POST",
        body: JSON.stringify({
          projectId: workspace.project.id,
          taskId: Number(taskId),
          machineId: machineId || null,
          comment: comment.trim(),
        }),
      });
      setComment("");
      await reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo iniciar la actividad.");
    } finally {
      finishAppLoading();
      setBusy(false);
    }
  };

  const finishActivity = async () => {
    setBusy(true);
    setError("");
    startAppLoading();
    try {
      await workforceRequest<{ activity: WorkerActivity }>("/api/worker/activities", {
        method: "PATCH",
        body: JSON.stringify({ comment: comment.trim() }),
      });
      setComment("");
      await reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo finalizar la actividad.");
    } finally {
      finishAppLoading();
      setBusy(false);
    }
  };

  if (loading) {
    return <Box px={6} py={10}><Text color="#7A8694">Cargando actividades...</Text></Box>;
  }

  return (
    <Box maxW="1400px" mx="auto" px={{ base: 4, md: 6, lg: 8 }} py={{ base: 5, md: 7 }}>
      <Box mb={6}>
        <Text fontSize="sm" color="#7A8694" mb={1}>{workspace?.project?.name ?? "Mi obra"}</Text>
        <Heading size="lg" color="#263238">Actividades</Heading>
        <Text mt={1} fontSize="sm" color="#7A8694">Selecciona una actividad, registra la maquinaria utilizada y agrega comentarios de avance.</Text>
      </Box>

      {error && <Text mb={4} color="#B42318" role="alert">{error}</Text>}

      {!workspace?.project ? (
        <Card.Root border="1px solid #E8EDF3" borderRadius="16px" bg="white">
          <Card.Body p={6}>
            <Heading size="sm" color="#263238">Aún no tienes una obra asignada</Heading>
            <Text mt={2} fontSize="sm" color="#7A8694">Pide al administrador que asigne una obra para consultar las actividades disponibles.</Text>
          </Card.Body>
        </Card.Root>
      ) : (
        <>
          {workspace.activeActivity ? (
            <Card.Root mb={5} border="1px solid #BCD8CE" borderRadius="16px" bg="#F5FBF8">
              <Card.Body p={{ base: 4, md: 6 }}>
                <Flex direction={{ base: "column", sm: "row" }} align={{ base: "stretch", sm: "center" }} justify="space-between" gap={4}>
                  <Box>
                    <Flex align="center" gap={2} color="#2E9B6F"><Activity size={18} /><Text fontSize="sm" fontWeight="700">Actividad en curso</Text></Flex>
                    <Heading size="md" mt={2} color="#263238">{workspace.activeActivity.taskTitle}</Heading>
                    <Flex wrap="wrap" gap={4} mt={2} color="#627181" fontSize="sm">
                      <Text><Clock3 size={14} style={{ display: "inline", marginRight: 5 }} />{elapsedLabel(workspace.activeActivity.startedAt, now)}</Text>
                      {workspace.activeActivity.machineName && <Text><Wrench size={14} style={{ display: "inline", marginRight: 5 }} />{workspace.activeActivity.machineName}</Text>}
                    </Flex>
                  </Box>
                  <Button w={{ base: "full", sm: "auto" }} minH="46px" bg="#2E9B6F" color="white" onClick={finishActivity} disabled={busy}>
                    <CheckCircle2 size={17} />{busy ? "Guardando..." : "Finalizar actividad"}
                  </Button>
                </Flex>
                {workspace.activeActivity.comment && <Text mt={3} fontSize="sm" color="#627181">Comentario: {workspace.activeActivity.comment}</Text>}
                <Field.Root mt={4}>
                  <Field.Label color="#52606B">Comentario de cierre (opcional)</Field.Label>
                  <Textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} rows={2} placeholder="Describe el avance o una observación" borderColor="#DCE3EA" />
                </Field.Root>
              </Card.Body>
            </Card.Root>
          ) : (
            <Card.Root mb={5} border="1px solid #E8EDF3" borderRadius="16px" bg="white">
              <Card.Body p={{ base: 4, md: 6 }}>
                <Flex align="center" gap={2} mb={4}><Activity size={18} color="#2F507F" /><Heading size="sm" color="#263238">Iniciar actividad</Heading></Flex>
                {!workspace.activeShift && <Text mb={4} fontSize="sm" color="#B18419">Primero registra tu ingreso desde Asistencia o el Dashboard.</Text>}
                <form onSubmit={submitActivity}>
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                    <Field.Root required>
                      <Field.Label>Actividad de la obra</Field.Label>
                      <select value={taskId} onChange={(event) => setTaskId(event.target.value)} required disabled={!availableTasks.length} style={{ width: "100%", height: "40px", border: "1px solid #DCE3EA", borderRadius: "8px", padding: "0 12px", color: "#263238", background: "white" }}>
                        <option value="" disabled>Selecciona una actividad</option>
                        {availableTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
                      </select>
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Maquinaria utilizada (opcional)</Field.Label>
                      <select value={machineId} onChange={(event) => setMachineId(event.target.value)} style={{ width: "100%", height: "40px", border: "1px solid #DCE3EA", borderRadius: "8px", padding: "0 12px", color: "#263238", background: "white" }}>
                        <option value="">Sin maquinaria</option>
                        {workspace.machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.name}</option>)}
                      </select>
                    </Field.Root>
                    <Field.Root gridColumn={{ base: "auto", md: "span 2" }}>
                      <Field.Label>Comentario (opcional)</Field.Label>
                      <Textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} rows={3} placeholder="Agrega un comentario para el administrador o supervisor" borderColor="#DCE3EA" />
                    </Field.Root>
                  </SimpleGrid>
                  <Flex justify="flex-end" mt={4}>
                    <Button type="submit" w={{ base: "full", sm: "auto" }} bg="#2F507F" color="white" disabled={busy || !workspace.activeShift || !availableTasks.length}>
                      {busy ? "Iniciando..." : "Iniciar actividad"}
                    </Button>
                  </Flex>
                </form>
                {!availableTasks.length && <Text mt={3} fontSize="sm" color="#7A8694">No hay actividades pendientes en tu obra.</Text>}
              </Card.Body>
            </Card.Root>
          )}

          <Card.Root border="1px solid #E8EDF3" borderRadius="16px" bg="white">
            <Card.Body p={{ base: 4, md: 6 }}>
              <Heading size="sm" color="#263238" mb={4}>Historial de actividades</Heading>
              {workspace.activities.length ? (
                <Box>
                  {workspace.activities.map((activity) => (
                    <Flex key={activity.id} justify="space-between" gap={4} py={3} borderBottom="1px solid #EEF1F4">
                      <Box minW="0">
                        <Text fontSize="sm" fontWeight="600" color="#263238">{activity.taskTitle}</Text>
                        <Text mt={1} fontSize="xs" color="#7A8694">
                          {new Date(activity.startedAt).toLocaleString("es-CL")}
                          {activity.machineName ? ` · ${activity.machineName}` : ""}
                        </Text>
                        {activity.comment && <Text mt={1} fontSize="sm" color="#627181">{activity.comment}</Text>}
                      </Box>
                      <Text fontSize="xs" color="#7A8694" flexShrink={0}>
                        {activity.durationSeconds === undefined ? "En curso" : `${(activity.durationSeconds / 3600).toLocaleString("es-CL", { maximumFractionDigits: 2 })} h`}
                      </Text>
                    </Flex>
                  ))}
                </Box>
              ) : (
                <Text fontSize="sm" color="#7A8694">Aún no has registrado actividades.</Text>
              )}
            </Card.Body>
          </Card.Root>
        </>
      )}
    </Box>
  );
}
