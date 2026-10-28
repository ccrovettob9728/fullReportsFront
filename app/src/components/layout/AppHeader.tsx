"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Bell,
  Building2,
  Check,
  ChevronDown,
  LogOut,
  Menu,
} from "lucide-react";

import {
  Box,
  Flex,
  IconButton,
  Portal,
  Select,
  Text,
  createListCollection,
} from "@chakra-ui/react";

const notifications = [
  {
    id: 1,
    title: "Tarea que requiere revisión",
    description: "Revisar antecedentes con el supervisor",
    href: "/tareas/2",
    unread: true,
  },
  {
    id: 2,
    title: "Nueva tarea en progreso",
    description: "Revisar canalizaciones eléctricas",
    href: "/tareas/4",
    unread: false,
  },
];

interface Project {
  id: number;
  name: string;
}

interface AppHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  selectedProjectId: number;
  projects: Project[];
  onProjectChange: (projectId: number) => void;
}

export default function AppHeader({
  sidebarOpen,
  onToggleSidebar,
  selectedProjectId,
  projects,
  onProjectChange,
}: AppHeaderProps) {
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotifications, setReadNotifications] = useState<number[]>([]);
  const projectCollection = useMemo(
    () =>
      createListCollection({
        items: projects.map((project) => ({
          label: project.name,
          value: String(project.id),
        })),
      }),
    [projects],
  );
  const unreadCount = notifications.filter(
    (notification) => notification.unread && !readNotifications.includes(notification.id),
  ).length;

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { user?: { name: string; email: string; role: string } | null }) => {
        setUser(data.user ?? null);
      })
      .catch(() => setUser(null));
  }, []);

  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    superadmin: "Superadministrador",
    supervisor: "Supervisor",
    trabajador: "Trabajador",
  };

  return (
    <Box
      as="header"
      h="64px"
      flexShrink={0}
      bg="#F8FAFC"
      px={{ base: 3, md: 6 }}
    >
      <Flex
        h="100%"
        align="center"
        justify="space-between"
        gap={3}
      >
        {/* IZQUIERDA */}
        <Flex
          align="center"
          gap={2}
          minW="0"
          flex="1"
        >
          {/* BOTÓN SIDEBAR */}
          <IconButton
            aria-label={
              sidebarOpen
                ? "Ocultar menú"
                : "Mostrar menú"
            }
            variant="ghost"
            size="sm"
            color="#52606B"
            flexShrink={0}
            onClick={onToggleSidebar}
            display={{ base: "inline-flex", lg: sidebarOpen ? "none" : "inline-flex" }}
            _hover={{
              bg: "#E9EEF3",
              color: "#2F507F",
            }}
          >
            <Menu size={19} />
          </IconButton>

          {/* OBRA */}
          <Flex
            align="center"
            gap={2}
            minW="0"
          >
            <Text
              display={{
                base: "none",
                md: "block",
              }}
              fontSize="10px"
              fontWeight="700"
              color="#8793A0"
              textTransform="uppercase"
              letterSpacing="0.06em"
              flexShrink={0}
            >
              Obra
            </Text>

            {user?.role === "trabajador" ? (
              <Text
                maxW={{ base: "190px", sm: "260px", md: "360px" }}
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
                fontSize="sm"
                fontWeight="600"
                color="#263238"
              >
                {projects[0]?.name ?? "Sin obra asignada"}
              </Text>
            ) : <Box
              minW="0"
              w={{ base: "full", sm: "auto" }}
              maxW={{
                base: "190px",
                sm: "260px",
                md: "360px",
                lg: "450px",
              }}
              position="relative"
              border="1px solid #DCE3EA"
              borderRadius="10px"
              bg="white"
              boxShadow="0 2px 6px rgba(38, 50, 56, 0.04)"
              transition="border-color .2s ease, box-shadow .2s ease"
              _hover={{
                borderColor: "#B9C9DA",
                boxShadow: "0 4px 12px rgba(38, 50, 56, 0.08)",
              }}
            >
              <Select.Root
                collection={projectCollection}
                value={[String(selectedProjectId)]}
                onValueChange={(details) => {
                  const projectId = Number(details.value[0]);
                  if (Number.isFinite(projectId)) onProjectChange(projectId);
                }}
                positioning={{ sameWidth: true, gutter: 6 }}
                size="sm"
              >
                <Select.HiddenSelect />
                <Select.Control>
                  <Select.Trigger
                    w="full"
                    h="40px"
                    display="flex"
                    alignItems="center"
                    gap={2}
                    px={3}
                    border="none"
                    bg="transparent"
                    color="#263238"
                    fontSize="sm"
                    fontWeight="600"
                    textAlign="left"
                    _focusVisible={{
                      outline: "none",
                      boxShadow: "0 0 0 2px #2F507F",
                    }}
                  >
                    <Building2 size={16} color="#2F507F" />
                    <Select.ValueText placeholder="Selecciona una obra" />
                    <Box ml="auto" color="#2F507F">
                      <ChevronDown size={16} />
                    </Box>
                  </Select.Trigger>
                </Select.Control>
                <Portal>
                  <Select.Positioner>
                    <Select.Content
                      p={1.5}
                      border="1px solid #E1E8F0"
                      borderRadius="12px"
                      bg="white"
                      boxShadow="0 14px 36px rgba(38, 50, 56, 0.16)"
                      zIndex={1300}
                    >
                      {projectCollection.items.map((project) => (
                        <Select.Item
                          key={project.value}
                          item={project}
                          px={3}
                          py={2.5}
                          borderRadius="8px"
                          color="#36434F"
                          cursor="pointer"
                          transition="background .15s ease, color .15s ease"
                          _highlighted={{ bg: "#EEF4FB", color: "#2F507F" }}
                          _selected={{ bg: "#E8EEF7", color: "#2F507F", fontWeight: "700" }}
                        >
                          <Select.ItemText>{project.label}</Select.ItemText>
                          <Select.ItemIndicator color="#2F507F">
                            <Check size={16} />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Portal>
              </Select.Root>
            </Box>}
          </Flex>
        </Flex>

        {/* DERECHA */}
        <Flex
          align="center"
          gap={2}
          flexShrink={0}
        >
          {/* NOTIFICACIONES */}
          <Box position="relative" display={user?.role === "trabajador" ? "none" : "block"}>
            <IconButton
              aria-label="Notificaciones"
              variant="ghost"
              size="sm"
              color="#6F7C89"
              onClick={() => setNotificationsOpen((open) => !open)}
              _hover={{
                bg: "#E9EEF3",
                color: "#2F507F",
              }}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <Box
                  position="absolute"
                  top="5px"
                  right="5px"
                  w="7px"
                  h="7px"
                  borderRadius="full"
                  bg="#C2414B"
                  border="2px solid #F8FAFC"
                />
              )}
            </IconButton>

            {notificationsOpen && (
              <Box
                position="absolute"
                top="calc(100% + 10px)"
                right="0"
                w={{ base: "calc(100vw - 1.5rem)", md: "360px" }}
                maxW="360px"
                bg="white"
                border="1px solid"
                borderColor="#DCE3EA"
                borderRadius="12px"
                boxShadow="0 12px 28px rgba(38, 50, 56, 0.14)"
                zIndex={1100}
                overflow="hidden"
              >
                <Flex align="center" justify="space-between" px={4} py={3} bg="#F1F4F7">
                  <Text fontSize="sm" fontWeight="700" color="#263238">Notificaciones</Text>
                  {unreadCount > 0 && <Text fontSize="xs" color="#C2414B">{unreadCount} sin leer</Text>}
                </Flex>

                {notifications.map((notification) => {
                  const unread = notification.unread && !readNotifications.includes(notification.id);

                  return (
                    <Link
                      key={notification.id}
                      href={notification.href}
                      style={{ textDecoration: "none" }}
                      onClick={() => {
                        setReadNotifications((current) => [...current, notification.id]);
                        setNotificationsOpen(false);
                      }}
                    >
                      <Flex
                        align="flex-start"
                        gap={3}
                        px={4}
                        py={3}
                        bg={unread ? "#F8FAFC" : "white"}
                        _hover={{ bg: "#EEF4FB" }}
                      >
                        <Box color={unread ? "#C2414B" : "#8793A0"} mt={1} flexShrink={0}>
                          <AlertCircle size={17} />
                        </Box>
                        <Box flex="1">
                          <Flex align="center" gap={2}>
                            <Text fontSize="sm" fontWeight={unread ? "700" : "600"} color="#263238">
                              {notification.title}
                            </Text>
                            {unread && <Box w="6px" h="6px" borderRadius="full" bg="#C2414B" flexShrink={0} />}
                          </Flex>
                          <Text mt={1} fontSize="xs" color="#7A8694">{notification.description}</Text>
                        </Box>
                      </Flex>
                    </Link>
                  );
                })}
              </Box>
            )}
          </Box>

          {/* USUARIO */}
          <Flex
            align="center"
            gap={2}
          >
            <Box
              w="34px"
              h="34px"
              borderRadius="full"
              bg="#E6EDF4"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text
                fontSize="sm"
                fontWeight="700"
                color="#2F507F"
              >
                {(user?.name ?? "U").slice(0, 1).toUpperCase()}
              </Text>
            </Box>

            <Text
              display={{
                base: "none",
                lg: "block",
              }}
              fontSize="xs"
              fontWeight="600"
              color="#36434F"
            >
              {user ? roleLabels[user.role] ?? user.role : "Usuario"}
            </Text>
          </Flex>

          <IconButton
            asChild
            aria-label="Cerrar sesión"
            title={user ? `Cerrar sesión de ${user.email}` : "Cerrar sesión"}
            variant="ghost"
            size="sm"
            color="#6F7C89"
            _hover={{ bg: "#FBEAEC", color: "#B42318" }}
          >
            <Link href="/api/auth/logout"><LogOut size={17} /></Link>
          </IconButton>
        </Flex>
      </Flex>
    </Box>
  );
}