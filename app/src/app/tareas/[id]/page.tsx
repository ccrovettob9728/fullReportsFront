"use client";

import { use, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ClipboardCheck, Clock3, Download, FileText, Image as ImageIcon, MessageSquare, Paperclip, Send } from "lucide-react";
import { Box, Button, Card, Field, Flex, Heading, Input, Text, Textarea } from "@chakra-ui/react";
import { taskStatusColors, taskStatusLabels } from "../../../data/tasks";
import { useProjectTasks } from "../../../data/workspace";

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { tasks, saveTasks } = useProjectTasks();
  const task = tasks.find((item) => item.id === Number(id));
  const [reviewStatus, setReviewStatus] = useState(task?.reviewStatus ?? "reviewed");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewDocument, setReviewDocument] = useState<File | null>(null);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<string[]>([]);
  const [activity, setActivity] = useState("");
  const [workersCount, setWorkersCount] = useState(task?.workersCount ?? 1);
  const [attachmentError, setAttachmentError] = useState("");

  const updateTask = (changes: Partial<NonNullable<typeof task>>) => {
    if (!task) return;
    saveTasks(tasks.map((item) => item.id === task.id ? { ...item, ...changes } : item));
  };

  const startWork = () => {
    updateTask({
      status: "in-progress",
      startedAt: new Date().toISOString(),
      startedCrewSize: Math.max(1, workersCount),
      workersCount: Math.max(1, workersCount),
      activityLog: [...(task?.activityLog ?? []), { at: new Date().toISOString(), description: "Inicio de trabajo" }],
    });
  };

  const finishWork = () => {
    if (!task?.startedAt) return;
    const elapsedHours = Math.max(0, (Date.now() - new Date(task.startedAt).getTime()) / 3_600_000);
    const actualManHours = Math.round(elapsedHours * (task.startedCrewSize ?? workersCount) * 100) / 100;
    updateTask({
      status: "done",
      completedAt: new Date().toISOString(),
      actualManHours,
      activityLog: [...(task.activityLog ?? []), { at: new Date().toISOString(), description: `Tarea finalizada · ${actualManHours} HH reales` }],
    });
  };

  const addActivity = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!task || !activity.trim()) return;
    updateTask({ activityLog: [...(task.activityLog ?? []), { at: new Date().toISOString(), description: activity.trim() }] });
    setActivity("");
  };

  const addComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!comment.trim()) return;
    setComments((current) => [...current, comment.trim()]);
    setComment("");
  };

  const handleReviewDocument = (event: ChangeEvent<HTMLInputElement>) => {
    setReviewDocument(event.target.files?.[0] ?? null);
  };

  const handleTaskPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length || !task) return;
    if (files.some((file) => file.size > 1_000_000) || files.reduce((total, file) => total + file.size, 0) > 2_000_000) {
      setAttachmentError("Cada foto debe pesar menos de 1 MB y el grupo no puede superar 2 MB.");
      return;
    }
    Promise.all(files.map((file) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("No se pudo leer la foto"));
      reader.onerror = () => reject(new Error("No se pudo leer la foto"));
      reader.readAsDataURL(file);
    }))).then((images) => updateTask({ imageUrls: [...(task.imageUrls ?? (task.imageUrl ? [task.imageUrl] : [])), ...images] })).catch(() => setAttachmentError("No se pudieron cargar las fotos seleccionadas."));
    setAttachmentError("");
  };

  const markAsReviewed = () => {
    setReviewStatus("reviewed");
  };

  if (!task) {
    return (
      <Box maxW="900px" mx="auto" px={{ base: 4, md: 6 }} py={10}>
        <Heading size="md" color="#263238">Tarea no encontrada</Heading>
        <Link href="/tareas" style={{ textDecoration: "none" }}>
          <Button mt={5} variant="outline">Volver a tareas</Button>
        </Link>
      </Box>
    );
  }

  return (
    <Box maxW="1100px" mx="auto" px={{ base: 4, md: 6, lg: 8 }} py={{ base: 5, md: 7 }}>
      <Link href="/tareas" style={{ textDecoration: "none" }}>
        <Flex align="center" gap={2} color="#2F507F" mb={5}>
          <ArrowLeft size={16} />
          <Text fontSize="sm" fontWeight="600">Volver a tareas</Text>
        </Flex>
      </Link>

      <Text fontSize="sm" color="#7A8694" mb={1}>{task.milestoneName}</Text>
      <Heading size="lg" color="#263238">{task.title}</Heading>
      <Text mt={2} fontSize="sm" color="#7A8694">TASK-{String(task.id).padStart(3, "0")}</Text>

      <Card.Root mt={6} border="1px solid" borderColor="#E8EDF3" borderRadius="16px" bg="white">
        <Card.Body p={{ base: 4, md: 6 }}>
          <Flex align="center" justify="space-between" gap={4} wrap="wrap">
            <Box>
              <Text fontSize="xs" color="#7A8694" mb={2}>Estado</Text>
              <Text display="inline-block" fontSize="sm" fontWeight="700" color={taskStatusColors[task.status]} bg={`${taskStatusColors[task.status]}18`} borderRadius="full" px={3} py={1}>{taskStatusLabels[task.status]}</Text>
            </Box>
            <Link href={`/hitos/${task.milestoneId}`} style={{ textDecoration: "none" }}>
              <Button variant="outline">Ver hito</Button>
            </Link>
          </Flex>

          <Box mt={5} p={4} bg="#F7F9FC" border="1px solid" borderColor="#E8EDF3" borderRadius="8px">
            <Flex align={{ base: "flex-start", md: "center" }} justify="space-between" gap={4} wrap="wrap">
              <Box>
                <Text fontSize="xs" color="#7A8694">Horas-hombre presupuestadas</Text>
                <Text fontSize="lg" fontWeight="700" color="#263238">{task.budgetedManHours ?? 0} HH</Text>
                <Text fontSize="xs" color="#7A8694">Reales registradas: {task.actualManHours ?? "Pendiente"} HH</Text>
              </Box>
              <Flex align="flex-end" gap={3} wrap="wrap">
                <Field.Root maxW="130px">
                  <Field.Label color="#52606B">Personas</Field.Label>
                  <Input type="number" min={1} value={workersCount} onChange={(event) => setWorkersCount(Math.max(1, Number(event.target.value)))} borderColor="#DCE3EA" />
                </Field.Root>
                {task.status !== "done" && !task.startedAt && <Button bg="#2F507F" color="white" onClick={startWork}><Clock3 size={15} />Iniciar trabajo</Button>}
                {task.status !== "done" && task.startedAt && <Button bg="#2E9B6F" color="white" onClick={finishWork}><CheckCircle2 size={15} />Finalizar tarea</Button>}
              </Flex>
            </Flex>
            {task.startedAt && task.status !== "done" && <Text mt={3} fontSize="xs" color="#2F507F">En ejecución desde {new Date(task.startedAt).toLocaleString("es-CL")} con {task.startedCrewSize ?? workersCount} personas.</Text>}
          </Box>

          <Box mt={5} p={4} borderRadius="10px" bg={reviewStatus === "pending" ? "#FFF8E8" : "#E8F5EF"} border="1px solid" borderColor={reviewStatus === "pending" ? "#F0D58A" : "#B9E2CF"}>
            <Flex align={{ base: "flex-start", md: "center" }} justify="space-between" direction={{ base: "column", md: "row" }} gap={4}>
              <Flex align="center" gap={3}>
                <ClipboardCheck size={19} color={reviewStatus === "pending" ? "#B18419" : "#2E9B6F"} />
                <Box>
                  <Text fontSize="sm" fontWeight="700" color="#263238">
                    {reviewStatus === "pending" ? "Tarea por revisar" : "Tarea revisada"}
                  </Text>
                  <Text mt={1} fontSize="xs" color="#7A8694">
                    {reviewStatus === "pending" ? "Añade una observación o documento antes de marcarla como revisada." : "La revisión quedó registrada para esta tarea."}
                  </Text>
                </Box>
              </Flex>
              {reviewStatus === "pending" && (
                <Button size="sm" bg="#B18419" color="white" onClick={markAsReviewed}>
                  <ClipboardCheck size={15} />
                  Marcar como revisada
                </Button>
              )}
            </Flex>

            {reviewStatus === "pending" && (
              <Flex direction="column" gap={3} mt={4}>
                <Textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} placeholder="Comentario de revisión para el equipo..." borderColor="#E4C978" rows={3} />
                <Flex align="center" gap={3} wrap="wrap">
                  <Input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={handleReviewDocument} display="none" id="review-document" />
                  <Button asChild variant="outline" size="sm" color="#52606B">
                    <label htmlFor="review-document"><Paperclip size={15} />Adjuntar documento</label>
                  </Button>
                  {reviewDocument && <Text fontSize="xs" color="#52606B">{reviewDocument.name}</Text>}
                </Flex>
              </Flex>
            )}

            {reviewStatus === "reviewed" && (reviewComment || reviewDocument) && (
              <Box mt={4} pt={3} borderTop="1px solid" borderColor="#B9E2CF">
                {reviewComment && <Text fontSize="sm" color="#52606B">{reviewComment}</Text>}
                {reviewDocument && <Text mt={2} fontSize="xs" color="#52606B">Documento: {reviewDocument.name}</Text>}
              </Box>
            )}
          </Box>

          <Box mt={7}>
            <Text fontSize="xs" fontWeight="700" color="#7A8694" textTransform="uppercase">Descripción</Text>
            <Text mt={2} color="#52606B" lineHeight="1.6">{task.description || "Sin descripción"}</Text>
          </Box>

          <Box mt={7}>
            <Flex align="center" justify="space-between" gap={3} wrap="wrap" mb={3}>
              <Text fontSize="xs" fontWeight="700" color="#7A8694" textTransform="uppercase">Evidencia fotográfica</Text>
              <Input type="file" accept="image/*" multiple onChange={handleTaskPhoto} aria-label="Adjuntar fotos de la tarea" maxW="320px" />
            </Flex>
            {attachmentError && <Text fontSize="xs" color="#B42318">{attachmentError}</Text>}
            {(task.imageUrls ?? (task.imageUrl ? [task.imageUrl] : [])).length > 0 && <Flex gap={3} wrap="wrap">{(task.imageUrls ?? (task.imageUrl ? [task.imageUrl] : [])).map((image, index) => <Box key={`${task.id}-photo-${index}`} borderRadius="8px" overflow="hidden" bg="#F1F4F7" w="180px" h="130px"><img src={image} alt={`Evidencia ${index + 1} de ${task.title}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></Box>)}</Flex>}
          </Box>

          {task.imageUrl && (
            <Box mt={7}>
              <Flex align="center" gap={2} mb={3}>
                <ImageIcon size={17} color="#2F507F" />
                <Text fontSize="sm" fontWeight="700" color="#263238">Imagen adjunta</Text>
              </Flex>
              <Box borderRadius="10px" overflow="hidden" bg="#F1F4F7" maxW="520px">
                <img src={task.imageUrl} alt={`Imagen de ${task.title}`} style={{ width: "100%", maxHeight: "300px", objectFit: "contain" }} />
              </Box>
            </Box>
          )}

          {task.documentUrl && (
            <Box mt={7}>
              <Flex align="center" justify="space-between" gap={3} p={4} borderRadius="10px" bg="#F8FAFC" border="1px solid" borderColor="#E8EDF3">
                <Flex align="center" gap={3}>
                  <FileText size={19} color="#2F507F" />
                  <Box>
                    <Text fontSize="sm" fontWeight="700" color="#263238">{task.documentName || "Documento adjunto"}</Text>
                    <Text fontSize="xs" color="#7A8694">Archivo disponible para descargar</Text>
                  </Box>
                </Flex>
                <Button asChild size="sm" bg="#2F507F" color="white">
                  <a href={task.documentUrl} download={task.documentName || true}><Download size={15} />Descargar</a>
                </Button>
              </Flex>
            </Box>
          )}

          <Box mt={8} pt={6} borderTop="1px solid" borderColor="#E8EDF3">
            <Heading size="sm" color="#263238" mb={4}>Registro de actividades</Heading>
            <form onSubmit={addActivity}>
              <Field.Root>
                <Field.Label color="#52606B">Actividad realizada</Field.Label>
                <Textarea value={activity} onChange={(event) => setActivity(event.target.value)} placeholder="Describe el trabajo realizado en la obra..." borderColor="#DCE3EA" rows={2} />
              </Field.Root>
              <Flex justify="flex-end" mt={3}>
                <Button type="submit" size="sm" variant="outline" color="#2F507F"><Send size={15} />Registrar actividad</Button>
              </Flex>
            </form>
            {(task.activityLog ?? []).length > 0 && <Flex direction="column" gap={2} mt={4}>{task.activityLog?.map((entry, index) => <Box key={`${entry.at}-${index}`} p={3} bg="#F8FAFC" border="1px solid" borderColor="#E8EDF3" borderRadius="6px"><Text fontSize="xs" color="#7A8694">{new Date(entry.at).toLocaleString("es-CL")}</Text><Text mt={1} fontSize="sm" color="#263238">{entry.description}</Text></Box>)}</Flex>}
          </Box>

          <Box mt={8} pt={6} borderTop="1px solid" borderColor="#E8EDF3">
            <Flex align="center" gap={2} mb={4}>
              <MessageSquare size={18} color="#2F507F" />
              <Heading size="sm" color="#263238">Comentarios</Heading>
            </Flex>

            <form onSubmit={addComment}>
              <Field.Root>
                <Field.Label color="#52606B">Añadir comentario</Field.Label>
                <Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Escribe una observación para el equipo..." borderColor="#DCE3EA" rows={3} />
              </Field.Root>
              <Flex justify="flex-end" mt={3}>
                <Button type="submit" size="sm" bg="#2F507F" color="white">
                  <Send size={15} />
                  Publicar comentario
                </Button>
              </Flex>
            </form>

            {comments.length > 0 && (
              <Flex direction="column" gap={2} mt={5}>
                {comments.map((item, index) => (
                  <Box key={`${item}-${index}`} p={3} borderRadius="8px" bg="#F8FAFC" border="1px solid" borderColor="#E8EDF3">
                    <Text fontSize="xs" fontWeight="700" color="#52606B">Administrador</Text>
                    <Text mt={1} fontSize="sm" color="#52606B">{item}</Text>
                  </Box>
                ))}
              </Flex>
            )}
          </Box>
        </Card.Body>
      </Card.Root>
    </Box>
  );
}
