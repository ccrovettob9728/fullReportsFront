"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileText, Image as ImageIcon, ListFilter, Search } from "lucide-react";
import {
  Box,
  Card,
  Flex,
  Heading,
  Input,
  Table,
  Text,
} from "@chakra-ui/react";
import { initialProjectTasks, taskStatusColors, taskStatusLabels } from "../../data/tasks";

export default function TasksPage() {
  const [query, setQuery] = useState("");

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return initialProjectTasks;

    return initialProjectTasks.filter((task) =>
      [task.title, task.description, task.milestoneName, taskStatusLabels[task.status]]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query]);

  return (
    <Box maxW="1600px" mx="auto" px={{ base: 4, md: 6, lg: 8 }} py={{ base: 5, md: 7 }}>
      <Box mb={6}>
        <Text fontSize="sm" color="#7A8694" mb={1}>Proyecto Condominio La Serena</Text>
        <Heading size="lg" color="#263238">Tareas del proyecto</Heading>
        <Text mt={1} fontSize="sm" color="#7A8694">Busca y revisa todas las tareas de la obra.</Text>
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
