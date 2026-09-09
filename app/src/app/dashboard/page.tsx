"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  TrendingUp,
} from "lucide-react";

import {
  Box,
  Card,
  Flex,
  Heading,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  initialProjects,
  PROJECTS_STORAGE_KEY,
  SELECTED_PROJECT_STORAGE_KEY,
} from "../../data/projects";
import type { Project } from "../../types/project";

import ProgressCard from "../../components/dashboard/ProgressCard";

export default function DashboardPage() {
  /*
   * Datos temporales.
   * Más adelante estos datos vendrán desde Spring Boot.
   */
  const [projectName, setProjectName] = useState(initialProjects[0].name);

  useEffect(() => {
    const syncSelectedProject = window.setTimeout(() => {
      const storedProjects = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
      const requestedId = Number(new URLSearchParams(window.location.search).get("project"));
      const storedId = Number(
        window.localStorage.getItem(SELECTED_PROJECT_STORAGE_KEY),
      );
      const selectedId = requestedId || storedId || initialProjects[0].id;
      let availableProjects = initialProjects;

      if (storedProjects) {
        try {
          const parsedProjects = JSON.parse(storedProjects) as Project[];
          if (parsedProjects.length > 0) availableProjects = parsedProjects;
        } catch {
          availableProjects = initialProjects;
        }
      }

      const selectedProject = availableProjects.find((projectItem) => projectItem.id === selectedId);

      if (selectedProject) {
        setProjectName(selectedProject.name);
      }
    }, 0);

    return () => window.clearTimeout(syncSelectedProject);
  }, []);

  const project = {
    name: projectName,
    completedTasks: 68,
    totalTasks: 100,
  };

  const projectPercentage =
    project.totalTasks > 0
      ? Math.round(
          (project.completedTasks /
            project.totalTasks) *
            100
        )
      : 0;

  const documentStats = [
    {
      label: "Documentos registrados",
      value: "124",
      description: "documentos del proyecto",
      icon: FileText,
      color: "#2F507F",
      background: "#E8EEF7",
    },
    {
      label: "Por vencer",
      value: "3",
      description: "requieren seguimiento",
      icon: Clock3,
      color: "#B18419",
      background: "#FBF4D9",
    },
  ];

  const recentActivity = [
    {
      title: "Instalación eléctrica completada",
      description:
        "Subtarea marcada como completada",
      time: "Hace 12 min",
      icon: CheckCircle2,
    },
    {
      title: "Informe de avance actualizado",
      description:
        "Obra Condominio La Serena",
      time: "Hace 35 min",
      icon: FileText,
    },
    {
      title: "Nueva tarea pendiente",
      description:
        "Revisión de terminaciones",
      time: "Hace 1 h",
      icon: Clock3,
    },
  ];

  const pendingItems = [
    {
      title: "12 tareas pendientes",
      description:
        "Requieren seguimiento del supervisor.",
    },
    {
      title: "3 documentos por vencer",
      description:
        "Revisa la documentación próxima a vencer.",
    },
    {
      title: "2 hitos en proceso",
      description:
        "Todavía no cumplen todas sus tareas.",
    },
  ];

  const handlePeriodClick = (
    period: string
  ) => {
    console.log(
      `Abrir información ${period}`
    );
  };

  return (
    <Box
        px={{
          base: 4,
          md: 6,
          lg: 8,
        }}
        py={{
          base: 5,
          md: 7,
        }}
        maxW="1600px"
        mx="auto"
        w="100%"
      >
      {/* HEADER DASHBOARD */}
      <Box mb={6}>
        <Text
          fontSize="sm"
          color="#7A8694"
          mb={1}
        >
          Resumen general
        </Text>

        <Heading
          size="lg"
          fontWeight="700"
          color="#263238"
        >
          Dashboard
        </Heading>

        <Text
          mt={1}
          fontSize="sm"
          color="#7A8694"
        >
          Supervisa el avance de tus obras.
        </Text>
      </Box>

      {/* RESUMEN PRINCIPAL */}
      <SimpleGrid
        columns={{
          base: 1,
          lg: 3,
        }}
        gap={4}
        mb={6}
      >
        {/* GRÁFICO DE AVANCE */}
        <Link
          href="/hitos"
          style={{
            display: "block",
            textDecoration: "none",
          }}
        >
          <Card.Root
            gridColumn={{
              base: "auto",
              lg: "span 1",
            }}
            h="100%"
            border="1px solid"
            borderColor="#E8EDF3"
            borderRadius="18px"
            bg="white"
            boxShadow="0 4px 18px rgba(38, 50, 56, 0.04)"
            cursor="pointer"
            transition="all 0.2s ease"
            _hover={{
              transform: "translateY(-2px)",
              boxShadow: "0 8px 24px rgba(38, 50, 56, 0.09)",
              borderColor: "#C9D6E5",
            }}
          >
          <Card.Body p={5}>
            <Flex
              direction="column"
              h="100%"
              minH="210px"
              justify="space-between"
            >
              {/* Título */}
              <Box>
                <Text
                  fontSize="xs"
                  color="#7A8694"
                  fontWeight="600"
                  textTransform="uppercase"
                  letterSpacing="0.06em"
                >
                  Avance del proyecto
                </Text>

                <Heading
                  size="sm"
                  color="#263238"
                  mt={2}
                  fontWeight="700"
                >
                  {project.name}
                </Heading>
              </Box>

              {/* Gráfico */}
              <Flex
                align="center"
                justify="center"
                py={3}
              >
                <Box
                  position="relative"
                  w="130px"
                  h="130px"
                >
                  {/* Círculo exterior */}
                  <Box
                    position="absolute"
                    inset="0"
                    borderRadius="full"
                    bg="#E8EDF3"
                  />

                  {/* Progreso */}
                  <Box
                    position="absolute"
                    inset="0"
                    borderRadius="full"
                    bg={`conic-gradient(#2F507F ${projectPercentage * 3.6}deg, #E8EDF3 0deg)`}
                  />

                  {/* Centro */}
                  <Flex
                    position="absolute"
                    inset="10px"
                    borderRadius="full"
                    bg="white"
                    align="center"
                    justify="center"
                    direction="column"
                  >
                    <Text
                      fontSize="32px"
                      fontWeight="800"
                      lineHeight="1"
                      color="#2F507F"
                    >
                      {projectPercentage}%
                    </Text>

                    <Text
                      fontSize="10px"
                      color="#7A8694"
                      mt={1}
                    >
                      avance
                    </Text>
                  </Flex>
                </Box>
              </Flex>

              {/* Información */}
              <Flex
                justify="space-between"
                align="center"
              >
                <Text
                  fontSize="xs"
                  color="#52606B"
                >
                  Tareas completadas
                </Text>

                <Text
                  fontSize="xs"
                  fontWeight="700"
                  color="#2F507F"
                >
                  {project.completedTasks} de{" "}
                  {project.totalTasks}
                </Text>
              </Flex>
            </Flex>
          </Card.Body>
          </Card.Root>
        </Link>

        {/* STATUS DOCUMENTOS */}
        {documentStats.map((item) => {
          const Icon = item.icon;

          return (
            <Card.Root
              key={item.label}
              border="1px solid"
              borderColor={`${item.color}35`}
              borderRadius="18px"
              bg={item.background}
              boxShadow="0 4px 18px rgba(38, 50, 56, 0.04)"
            >
              <Card.Body p={5}>
                <Flex
                  direction="column"
                  justify="space-between"
                  minH="210px"
                >
                  <Flex
                    justify="space-between"
                    align="flex-start"
                  >
                    <Box>
                      <Text
                        fontSize="xs"
                        color="#5F6B76"
                        fontWeight="600"
                      >
                        {item.label}
                      </Text>

                      <Text
                        mt={3}
                        fontSize="42px"
                        lineHeight="1"
                        fontWeight="800"
                        color={item.color}
                        letterSpacing="-0.04em"
                      >
                        {item.value}
                      </Text>
                    </Box>

                    <Box
                      w="40px"
                      h="40px"
                      borderRadius="11px"
                      bg="white"
                      color={item.color}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Icon size={19} />
                    </Box>
                  </Flex>

                  <Box>
                    <Text
                      fontSize="xs"
                      color="#52606B"
                    >
                      {item.description}
                    </Text>

                    <Flex
                      align="center"
                      gap={1}
                      mt={3}
                    >
                      <TrendingUp
                        size={13}
                        color={item.color}
                      />

                      <Text
                        fontSize="xs"
                        fontWeight="600"
                        color={item.color}
                      >
                        Estado actual
                      </Text>
                    </Flex>
                  </Box>
                </Flex>
              </Card.Body>
            </Card.Root>
          );
        })}
      </SimpleGrid>

      {/* AVANCE */}
      <Box mb={6}>
        <Box mb={4}>
          <Heading
            size="sm"
            color="#263238"
            fontWeight="700"
          >
            Avance
          </Heading>

          <Text
            mt={1}
            fontSize="xs"
            color="#7A8694"
          >
            Selecciona un período para ver el
            detalle.
          </Text>
        </Box>

        <SimpleGrid
          columns={{
            base: 1,
            sm: 2,
            xl: 4,
          }}
          gap={4}
        >
          <ProgressCard
            title="Avance diario"
            completed={18}
            total={25}
            color="#2E9B6F"
            background="#E8F5EF"
            labelCompleted="subtareas"
            period="Hoy"
            onClick={() =>
              handlePeriodClick("diario")
            }
          />

          <ProgressCard
            title="Avance semanal"
            completed={68}
            total={100}
            color="#2F507F"
            background="#E8EEF7"
            labelCompleted="tareas"
            period="Esta semana"
            onClick={() =>
              handlePeriodClick("semanal")
            }
          />

          <ProgressCard
            title="Avance mensual"
            completed={8}
            total={12}
            color="#B18419"
            background="#FBF4D9"
            labelCompleted="hitos"
            period="Este mes"
            onClick={() =>
              handlePeriodClick("mensual")
            }
          />

          <ProgressCard
            title="Avance anual"
            completed={42}
            total={60}
            color="#8067B7"
            background="#F0EBF8"
            labelCompleted="objetivos"
            period="Este año"
            onClick={() =>
              handlePeriodClick("anual")
            }
          />
        </SimpleGrid>
      </Box>

      {/* ACTIVIDAD + PENDIENTES */}
      <SimpleGrid
        columns={{
          base: 1,
          lg: 2,
        }}
        gap={5}
      >
        {/* ACTIVIDAD */}
        <Card.Root
          border="1px solid"
          borderColor="#E8EDF3"
          borderRadius="18px"
          bg="white"
        >
          <Card.Body p={5}>
            <Heading
              size="sm"
              color="#263238"
              mb={1}
            >
              Actividad reciente
            </Heading>

            <Text
              fontSize="xs"
              color="#7A8694"
              mb={4}
            >
              Últimos movimientos del proyecto.
            </Text>

            <VStack
              align="stretch"
              gap={0}
            >
              {recentActivity.map(
                (activity, index) => {
                  const Icon = activity.icon;

                  return (
                    <Flex
                      key={activity.title}
                      py={4}
                      gap={3}
                      borderTop={
                        index === 0
                          ? "none"
                          : "1px solid"
                      }
                      borderColor="#EEF1F4"
                    >
                      <Box
                        flexShrink={0}
                        w="34px"
                        h="34px"
                        borderRadius="9px"
                        bg="#F1F5F9"
                        color="#2F507F"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Icon size={16} />
                      </Box>

                      <Box flex="1">
                        <Text
                          fontSize="sm"
                          fontWeight="600"
                          color="#263238"
                        >
                          {activity.title}
                        </Text>

                        <Text
                          mt={1}
                          fontSize="xs"
                          color="#7A8694"
                        >
                          {activity.description}
                        </Text>
                      </Box>

                      <Text
                        fontSize="10px"
                        color="#A0A9B4"
                        whiteSpace="nowrap"
                      >
                        {activity.time}
                      </Text>
                    </Flex>
                  );
                }
              )}
            </VStack>
          </Card.Body>
        </Card.Root>

        {/* PENDIENTES */}
        <Card.Root
          border="1px solid"
          borderColor="#E8EDF3"
          borderRadius="18px"
          bg="white"
        >
          <Card.Body p={5}>
            <Heading
              size="sm"
              color="#263238"
              mb={1}
            >
              Pendientes
            </Heading>

            <Text
              fontSize="xs"
              color="#7A8694"
              mb={4}
            >
              Elementos que requieren seguimiento.
            </Text>

            <VStack
              align="stretch"
              gap={3}
            >
              {pendingItems.map((item) => (
                <Flex
                  key={item.title}
                  gap={3}
                  p={4}
                  borderRadius="12px"
                  bg="#FAFBFC"
                  border="1px solid"
                  borderColor="#EEF1F4"
                >
                  <Box
                    flexShrink={0}
                    w="32px"
                    h="32px"
                    borderRadius="9px"
                    bg="#FFF6E0"
                    color="#B18419"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <AlertCircle size={16} />
                  </Box>

                  <Box>
                    <Text
                      fontSize="sm"
                      fontWeight="600"
                      color="#263238"
                    >
                      {item.title}
                    </Text>

                    <Text
                      mt={1}
                      fontSize="xs"
                      color="#7A8694"
                    >
                      {item.description}
                    </Text>
                  </Box>
                </Flex>
              ))}
            </VStack>
          </Card.Body>
        </Card.Root>
      </SimpleGrid>
    </Box>
  );
}