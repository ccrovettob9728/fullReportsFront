"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  Gauge,
  ShieldAlert,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Box,
  Card,
  Flex,
  Heading,
  SimpleGrid,
  Table,
  Text,
} from "@chakra-ui/react";
import { initialProjects } from "../../data/projects";
import { initialProjectTasks } from "../../data/tasks";

const metrics = [
  {
    label: "Eficiencia general",
    value: "86%",
    detail: "avance real frente al plan",
    color: "#2E9B6F",
    background: "#E8F5EF",
    icon: Gauge,
    trend: "+8% vs. período anterior",
    trendIcon: ArrowUpRight,
  },
  {
    label: "Tareas adelantadas",
    value: "2",
    detail: "terminadas antes de lo esperado",
    color: "#2F507F",
    background: "#E8EEF7",
    icon: TrendingUp,
    trend: "40% del total completado",
    trendIcon: ArrowUpRight,
  },
  {
    label: "Obras en riesgo",
    value: "1",
    detail: "requiere atención del equipo",
    color: "#C2414B",
    background: "#FBEAEC",
    icon: ShieldAlert,
    trend: "revisión recomendada hoy",
    trendIcon: AlertTriangle,
  },
  {
    label: "Obras atrasadas",
    value: "1",
    detail: "con avance bajo lo planificado",
    color: "#B18419",
    background: "#FBF4D9",
    icon: Clock3,
    trend: "2 tareas en progreso",
    trendIcon: ArrowDownRight,
  },
];

const projectSignals = [
  { name: initialProjects[0].name, progress: 68, planned: 72, status: "En riesgo", color: "#C2414B" },
  { name: initialProjects[1].name, progress: 54, planned: 48, status: "Adelantada", color: "#2E9B6F" },
  { name: initialProjects[2].name, progress: 31, planned: 45, status: "Atrasada", color: "#B18419" },
];

export default function IndicatorsPage() {
  const completedTasks = initialProjectTasks.filter((task) => task.status === "done").length;
  const pendingReviews = initialProjectTasks.filter((task) => task.reviewStatus === "pending").length;
  const inProgressTasks = initialProjectTasks.filter((task) => task.status === "in-progress").length;
  const completionRate = Math.round((completedTasks / initialProjectTasks.length) * 100);

  return (
    <Box maxW="1600px" mx="auto" px={{ base: 4, md: 6, lg: 8 }} py={{ base: 5, md: 7 }}>
      <Box mb={6}>
        <Text fontSize="sm" color="#7A8694" mb={1}>Control de desempeño</Text>
        <Heading size="lg" color="#263238">Indicadores</Heading>
        <Text mt={1} fontSize="sm" color="#7A8694">Detecta avances, atrasos y señales que requieren atención.</Text>
      </Box>

      <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} gap={4} mb={6}>
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const TrendIcon = metric.trendIcon;
          return (
            <Card.Root key={metric.label} border="1px solid" borderColor={`${metric.color}35`} borderRadius="14px" bg={metric.background}>
              <Card.Body p={5}>
                <Flex align="flex-start" justify="space-between" gap={3}>
                  <Box>
                    <Text fontSize="xs" fontWeight="700" color="#52606B">{metric.label}</Text>
                    <Text mt={3} fontSize="38px" lineHeight="1" fontWeight="800" color={metric.color}>{metric.value}</Text>
                  </Box>
                  <Box w="38px" h="38px" borderRadius="10px" bg="white" color={metric.color} display="flex" alignItems="center" justifyContent="center"><Icon size={19} /></Box>
                </Flex>
                <Text mt={4} fontSize="xs" color="#52606B">{metric.detail}</Text>
                <Flex align="center" gap={1} mt={3} color={metric.color}><TrendIcon size={14} /><Text fontSize="xs" fontWeight="700">{metric.trend}</Text></Flex>
              </Card.Body>
            </Card.Root>
          );
        })}
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, xl: 2 }} gap={5} mb={6}>
        <Card.Root border="1px solid" borderColor="#E8EDF3" borderRadius="16px" bg="white">
          <Card.Header borderBottom="1px solid" borderColor="#EEF1F4" px={{ base: 4, md: 6 }} py={4}>
            <Flex align="center" gap={2}><Target size={18} color="#2F507F" /><Heading size="sm" color="#263238">Cumplimiento de tareas</Heading></Flex>
          </Card.Header>
          <Card.Body p={{ base: 4, md: 6 }}>
            <Flex align="center" gap={6}>
              <Box w="150px" h="150px" borderRadius="full" bg={`conic-gradient(#2E9B6F ${completionRate * 3.6}deg, #E8EDF3 0deg)`} display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                <Flex w="88px" h="88px" borderRadius="full" bg="white" align="center" justify="center" direction="column"><Text fontSize="2xl" fontWeight="800" color="#2E9B6F">{completionRate}%</Text><Text fontSize="10px" color="#7A8694">completado</Text></Flex>
              </Box>
              <Box>
                <Text fontSize="sm" fontWeight="700" color="#263238">Ritmo de ejecución</Text>
                <Text mt={2} fontSize="sm" color="#7A8694">{completedTasks} de {initialProjectTasks.length} tareas terminadas.</Text>
                <Flex align="center" gap={2} mt={4}><Box w="8px" h="8px" borderRadius="full" bg="#2E9B6F" /><Text fontSize="xs" color="#52606B">Hechas · {completedTasks}</Text></Flex>
                <Flex align="center" gap={2} mt={2}><Box w="8px" h="8px" borderRadius="full" bg="#2F507F" /><Text fontSize="xs" color="#52606B">En proceso · {inProgressTasks}</Text></Flex>
                <Flex align="center" gap={2} mt={2}><Box w="8px" h="8px" borderRadius="full" bg="#B18419" /><Text fontSize="xs" color="#52606B">Por hacer · {initialProjectTasks.length - completedTasks - inProgressTasks}</Text></Flex>
              </Box>
            </Flex>
          </Card.Body>
        </Card.Root>

        <Card.Root border="1px solid" borderColor="#E8EDF3" borderRadius="16px" bg="white">
          <Card.Header borderBottom="1px solid" borderColor="#EEF1F4" px={{ base: 4, md: 6 }} py={4}>
            <Flex align="center" gap={2}><AlertTriangle size={18} color="#B18419" /><Heading size="sm" color="#263238">Señales de atención</Heading></Flex>
          </Card.Header>
          <Card.Body p={{ base: 4, md: 6 }}>
            <Flex align="center" justify="space-between" py={3} borderBottom="1px solid" borderColor="#EEF1F4"><Box><Text fontSize="sm" fontWeight="700" color="#263238">Tareas por revisar</Text><Text mt={1} fontSize="xs" color="#7A8694">Esperan validación del gerente.</Text></Box><Text fontSize="xl" fontWeight="800" color="#C2414B">{pendingReviews}</Text></Flex>
            <Flex align="center" justify="space-between" py={3} borderBottom="1px solid" borderColor="#EEF1F4"><Box><Text fontSize="sm" fontWeight="700" color="#263238">Tareas en proceso</Text><Text mt={1} fontSize="xs" color="#7A8694">Trabajo activo que debe monitorearse.</Text></Box><Text fontSize="xl" fontWeight="800" color="#2F507F">{inProgressTasks}</Text></Flex>
            <Flex align="center" justify="space-between" py={3}><Box><Text fontSize="sm" fontWeight="700" color="#263238">Obras bajo plan</Text><Text mt={1} fontSize="xs" color="#7A8694">Presentan avance inferior al esperado.</Text></Box><Text fontSize="xl" fontWeight="800" color="#B18419">1</Text></Flex>
          </Card.Body>
        </Card.Root>
      </SimpleGrid>

      <Card.Root border="1px solid" borderColor="#E8EDF3" borderRadius="16px" bg="white" overflow="hidden">
        <Card.Header borderBottom="1px solid" borderColor="#E8EDF3" px={{ base: 4, md: 6 }} py={4}>
          <Flex align="center" justify="space-between"><Heading size="sm" color="#263238">Estado por obra</Heading><Text fontSize="xs" color="#7A8694">Comparación real vs. plan</Text></Flex>
        </Card.Header>
        <Box overflowX="auto">
          <Table.Root minW="680px" variant="line">
            <Table.Header bg="#F8FAFC"><Table.Row><Table.ColumnHeader color="#7A8694" fontSize="xs">Obra</Table.ColumnHeader><Table.ColumnHeader color="#7A8694" fontSize="xs">Avance real</Table.ColumnHeader><Table.ColumnHeader color="#7A8694" fontSize="xs">Avance planificado</Table.ColumnHeader><Table.ColumnHeader color="#7A8694" fontSize="xs">Diferencia</Table.ColumnHeader><Table.ColumnHeader color="#7A8694" fontSize="xs">Señal</Table.ColumnHeader></Table.Row></Table.Header>
            <Table.Body>{projectSignals.map((project) => { const difference = project.progress - project.planned; return <Table.Row key={project.name} _hover={{ bg: "#FAFCFE" }}><Table.Cell><Text fontSize="sm" fontWeight="700" color="#263238">{project.name}</Text></Table.Cell><Table.Cell><Text fontSize="sm" fontWeight="700" color="#2F507F">{project.progress}%</Text></Table.Cell><Table.Cell><Text fontSize="sm" color="#52606B">{project.planned}%</Text></Table.Cell><Table.Cell><Text fontSize="sm" fontWeight="700" color={difference >= 0 ? "#2E9B6F" : "#C2414B"}>{difference >= 0 ? "+" : ""}{difference}%</Text></Table.Cell><Table.Cell><Text display="inline-block" fontSize="xs" fontWeight="700" color={project.color} bg={`${project.color}18`} borderRadius="full" px={3} py={1}>{project.status}</Text></Table.Cell></Table.Row>; })}</Table.Body>
          </Table.Root>
        </Box>
      </Card.Root>

      <Flex justify="flex-end" mt={5}><Link href="/reportes" style={{ textDecoration: "none" }}><Text fontSize="sm" fontWeight="700" color="#2F507F">Ver reportes detallados →</Text></Link></Flex>
    </Box>
  );
}
