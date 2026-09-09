"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";
import { BarChart3, CalendarDays, Download, FileText, Sparkles } from "lucide-react";
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
} from "@chakra-ui/react";
import { initialProjects } from "../../data/projects";
import { initialProjectTasks, taskStatusColors, taskStatusLabels, type TaskStatus } from "../../data/tasks";

 type ReportPeriod = "daily" | "weekly" | "monthly" | "annual";
type ReportScope = "project" | "milestone" | "task";

const periodOptions: Array<{ value: ReportPeriod; label: string; description: string }> = [
  { value: "daily", label: "Diario", description: "Resumen de la actividad de hoy." },
  { value: "weekly", label: "Semanal", description: "Avance y pendientes de la semana." },
  { value: "monthly", label: "Mensual", description: "Resumen completo del mes." },
  { value: "annual", label: "Anual", description: "Balance general del año." },
];

const scopeOptions: Array<{ value: ReportScope; label: string }> = [
  { value: "project", label: "Obra completa" },
  { value: "milestone", label: "Hito" },
  { value: "task", label: "Tarea" },
];

const fallbackProject = initialProjects[0];

function getPeriodLabel(period: ReportPeriod) {
  return periodOptions.find((option) => option.value === period)?.label ?? "Mensual";
}

function getScopeLabel(scope: ReportScope) {
  return scopeOptions.find((option) => option.value === scope)?.label ?? "Obra completa";
}

function drawPieChart(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 360;
  canvas.height = 360;
  const context = canvas.getContext("2d");
  if (!context) return "";

  const values = [2, 2, 1];
  const colors = ["#B18419", "#2F507F", "#2E9B6F"];
  const total = values.reduce((sum, value) => sum + value, 0);
  let startAngle = -Math.PI / 2;

  values.forEach((value, index) => {
    const angle = (value / total) * Math.PI * 2;
    context.beginPath();
    context.moveTo(180, 180);
    context.arc(180, 180, 145, startAngle, startAngle + angle);
    context.closePath();
    context.fillStyle = colors[index];
    context.fill();
    startAngle += angle;
  });

  context.beginPath();
  context.arc(180, 180, 68, 0, Math.PI * 2);
  context.fillStyle = "#FFFFFF";
  context.fill();
  return canvas.toDataURL("image/png");
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  const [scope, setScope] = useState<ReportScope>("project");
  const [milestoneId, setMilestoneId] = useState("1");
  const [taskId, setTaskId] = useState("1");
  const [reportGenerated, setReportGenerated] = useState(false);

  const selectedMilestone = initialProjectTasks.find((task) => task.milestoneId === milestoneId)?.milestoneName ?? "Permisos municipales aprobados";
  const selectedTask = initialProjectTasks.find((task) => task.id === Number(taskId)) ?? initialProjectTasks[0];
  const selectedSubject = scope === "project" ? fallbackProject.name : scope === "milestone" ? selectedMilestone : selectedTask.title;
  const taskCounts = initialProjectTasks.reduce<Record<TaskStatus, number>>((counts, task) => {
    counts[task.status] += 1;
    return counts;
  }, { todo: 0, "in-progress": 0, done: 0 });
  const completedPercentage = Math.round((taskCounts.done / initialProjectTasks.length) * 100);

  const generatePdf = () => {
    const document = new jsPDF({ unit: "mm", format: "a4" });
    const chart = drawPieChart();
    const pageWidth = document.internal.pageSize.getWidth();
    document.setFillColor(47, 80, 127);
    document.rect(0, 0, pageWidth, 25, "F");
    document.setTextColor(255, 255, 255);
    document.setFontSize(18);
    document.text("FullReports", 18, 16);
    document.setFontSize(10);
    document.text("Reporte de avance", pageWidth - 18, 16, { align: "right" });

    document.setTextColor(38, 50, 56);
    document.setFontSize(17);
    document.text(selectedSubject, 18, 42);
    document.setFontSize(10);
    document.setTextColor(100, 114, 127);
    document.text(`${getPeriodLabel(period)} · ${getScopeLabel(scope)} · 09/09/2026`, 18, 50);

    document.setTextColor(38, 50, 56);
    document.setFontSize(12);
    document.text("Resumen ejecutivo", 18, 68);
    document.setFontSize(10);
    document.setTextColor(82, 96, 107);
    document.text(`Avance general: ${completedPercentage}%`, 18, 78);
    document.text(`Tareas totales: ${initialProjectTasks.length}`, 18, 86);
    document.text(`Tareas completadas: ${taskCounts.done}`, 18, 94);
    document.text(`Tareas pendientes: ${taskCounts.todo + taskCounts["in-progress"]}`, 18, 102);

    if (chart) document.addImage(chart, "PNG", 125, 62, 62, 62);
    document.setFillColor(177, 132, 25);
    document.circle(128, 136, 2, "F");
    document.setTextColor(82, 96, 107);
    document.text("Por hacer", 134, 137);
    document.setFillColor(47, 80, 127);
    document.circle(128, 144, 2, "F");
    document.text("En progreso", 134, 145);
    document.setFillColor(46, 155, 111);
    document.circle(128, 152, 2, "F");
    document.text("Hechas", 134, 153);

    document.setTextColor(38, 50, 56);
    document.setFontSize(12);
    document.text("Actividad destacada", 18, 177);
    document.setFontSize(10);
    document.setTextColor(82, 96, 107);
    initialProjectTasks.slice(0, 4).forEach((task, index) => {
      document.text(`${index + 1}. ${task.title} · ${taskStatusLabels[task.status]}`, 18, 188 + index * 9);
    });
    document.setTextColor(130, 143, 154);
    document.setFontSize(8);
    document.text("Generado por FullReports", 18, 285);
    document.save(`reporte-${period}-${scope}.pdf`);
  };

  return (
    <Box maxW="1600px" mx="auto" px={{ base: 4, md: 6, lg: 8 }} py={{ base: 5, md: 7 }}>
      <Box mb={6}>
        <Text fontSize="sm" color="#7A8694" mb={1}>Centro de reportes</Text>
        <Heading size="lg" color="#263238">Solicitar un reporte</Heading>
        <Text mt={1} fontSize="sm" color="#7A8694">Genera un resumen de una obra, hito o tarea en una sola página.</Text>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} gap={4} mb={6}>
        {periodOptions.map((option) => (
          <Card.Root
            key={option.value}
            cursor="pointer"
            border="1px solid"
            borderColor={period === option.value ? "#2F507F" : "#E8EDF3"}
            bg={period === option.value ? "#EEF4FB" : "white"}
            borderRadius="14px"
            onClick={() => setPeriod(option.value)}
            _hover={{ borderColor: "#2F507F" }}
          >
            <Card.Body p={4}>
              <Flex align="center" gap={3}>
                <Box color={period === option.value ? "#2F507F" : "#7A8694"}>
                  <CalendarDays size={19} />
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="700" color="#263238">
                    Reporte {option.label.toLowerCase()}
                  </Text>
                  <Text mt={1} fontSize="xs" color="#7A8694">
                    {option.description}
                  </Text>
                </Box>
              </Flex>
            </Card.Body>
          </Card.Root>
        ))}
      </SimpleGrid>

      <Card.Root border="1px solid" borderColor="#E8EDF3" borderRadius="16px" bg="white" mb={6}>
        <Card.Body p={{ base: 4, md: 6 }}>
          <Flex align="center" gap={2} mb={5}><Sparkles size={18} color="#2F507F" /><Heading size="sm" color="#263238">Configurar solicitud</Heading></Flex>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            <Field.Root>
              <Field.Label color="#52606B">Alcance del reporte</Field.Label>
              <select value={scope} onChange={(event) => setScope(event.target.value as ReportScope)} style={{ width: "100%", height: "40px", border: "1px solid #DCE3EA", borderRadius: "6px", padding: "0 12px", color: "#263238", background: "white" }}>
                {scopeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </Field.Root>
            <Field.Root>
              <Field.Label color="#52606B">Obra</Field.Label>
              <Input value={fallbackProject.name} readOnly borderColor="#DCE3EA" />
            </Field.Root>
            {scope === "milestone" && <Field.Root><Field.Label color="#52606B">Hito</Field.Label><select value={milestoneId} onChange={(event) => setMilestoneId(event.target.value)} style={{ width: "100%", height: "40px", border: "1px solid #DCE3EA", borderRadius: "6px", padding: "0 12px", color: "#263238", background: "white" }}>{Array.from(new Map(initialProjectTasks.map((task) => [task.milestoneId, task.milestoneName]))).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field.Root>}
            {scope === "task" && <Field.Root><Field.Label color="#52606B">Tarea</Field.Label><select value={taskId} onChange={(event) => setTaskId(event.target.value)} style={{ width: "100%", height: "40px", border: "1px solid #DCE3EA", borderRadius: "6px", padding: "0 12px", color: "#263238", background: "white" }}>{initialProjectTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></Field.Root>}
          </SimpleGrid>
          <Flex justify="flex-end" mt={5}><Button bg="#2F507F" color="white" onClick={() => setReportGenerated(true)}><FileText size={16} />Generar vista previa</Button></Flex>
        </Card.Body>
      </Card.Root>

      {reportGenerated && (
        <Card.Root maxW="900px" mx="auto" border="1px solid" borderColor="#DCE3EA" borderRadius="4px" bg="white" boxShadow="0 8px 30px rgba(38, 50, 56, 0.08)">
          <Card.Body p={{ base: 5, md: 10 }}>
            <Flex justify="space-between" align="flex-start" borderBottom="3px solid #2F507F" pb={5}>
              <Box><Text fontSize="xs" color="#7A8694">FULLREPORTS · REPORTE {getPeriodLabel(period).toUpperCase()}</Text><Heading size="lg" color="#263238" mt={2}>{selectedSubject}</Heading><Text mt={1} fontSize="sm" color="#7A8694">{getScopeLabel(scope)} · 09 de septiembre de 2026</Text></Box>
              <BarChart3 size={28} color="#2F507F" />
            </Flex>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={8} mt={7}>
              <Box><Text fontSize="xs" fontWeight="700" color="#7A8694" textTransform="uppercase">Resumen ejecutivo</Text><Heading size="xl" color="#2F507F" mt={3}>{completedPercentage}%</Heading><Text mt={1} fontSize="sm" color="#52606B">avance completado</Text><Text mt={5} fontSize="sm" color="#52606B">{initialProjectTasks.length} tareas registradas, {taskCounts.done} completadas y {taskCounts.todo + taskCounts["in-progress"]} pendientes.</Text></Box>
              <Flex align="center" justify="center" gap={6}><Box w="150px" h="150px" borderRadius="full" bg={`conic-gradient(${taskStatusColors.todo} 0deg 144deg, ${taskStatusColors["in-progress"]} 144deg 288deg, ${taskStatusColors.done} 288deg 360deg)`} display="flex" alignItems="center" justifyContent="center"><Box w="76px" h="76px" borderRadius="full" bg="white" /></Box><Box><Flex align="center" gap={2} mb={2}><Box w="8px" h="8px" borderRadius="full" bg={taskStatusColors.todo} /><Text fontSize="xs" color="#52606B">Por hacer · {taskCounts.todo}</Text></Flex><Flex align="center" gap={2} mb={2}><Box w="8px" h="8px" borderRadius="full" bg={taskStatusColors["in-progress"]} /><Text fontSize="xs" color="#52606B">En progreso · {taskCounts["in-progress"]}</Text></Flex><Flex align="center" gap={2}><Box w="8px" h="8px" borderRadius="full" bg={taskStatusColors.done} /><Text fontSize="xs" color="#52606B">Hechas · {taskCounts.done}</Text></Flex></Box></Flex>
            </SimpleGrid>
            <Box mt={8} pt={5} borderTop="1px solid" borderColor="#E8EDF3"><Text fontSize="xs" fontWeight="700" color="#7A8694" textTransform="uppercase">Actividad destacada</Text>{initialProjectTasks.slice(0, 4).map((task) => <Flex key={task.id} justify="space-between" gap={3} py={3} borderBottom="1px solid" borderColor="#F0F2F4"><Text fontSize="sm" color="#263238">{task.title}</Text><Text fontSize="xs" color={taskStatusColors[task.status]} fontWeight="700">{taskStatusLabels[task.status]}</Text></Flex>)}</Box>
            <Flex justify="flex-end" mt={7}><Button bg="#2F507F" color="white" onClick={generatePdf}><Download size={16} />Descargar PDF</Button></Flex>
          </Card.Body>
        </Card.Root>
      )}
    </Box>
  );
}
