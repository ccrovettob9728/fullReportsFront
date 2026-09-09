"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import {
  Box,
  Flex,
  IconButton,
  NativeSelect,
  Text,
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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotifications, setReadNotifications] = useState<number[]>([]);
  const unreadCount = notifications.filter(
    (notification) => notification.unread && !readNotifications.includes(notification.id),
  ).length;

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
            _hover={{
              bg: "#E9EEF3",
              color: "#2F507F",
            }}
          >
            {sidebarOpen ? (
              <PanelLeftClose size={19} />
            ) : (
              <PanelLeftOpen size={19} />
            )}
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

            <Box
              minW="0"
              maxW={{
                base: "190px",
                sm: "260px",
                md: "360px",
                lg: "450px",
              }}
            >
              <NativeSelect.Root size="sm">
                <NativeSelect.Field
                  value={selectedProjectId}
                  onChange={(event) =>
                    onProjectChange(
                      Number(event.target.value)
                    )
                  }
                  border="none"
                  bg="transparent"
                  borderRadius="8px"
                  color="#36434F"
                  fontSize="sm"
                  fontWeight="600"
                  px={1}
                  _focus={{
                    boxShadow: "none",
                  }}
                >
                  {projects.map((project) => (
                    <option
                      key={project.id}
                      value={project.id}
                    >
                      {project.name}
                    </option>
                  ))}
                </NativeSelect.Field>

                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Box>
          </Flex>
        </Flex>

        {/* DERECHA */}
        <Flex
          align="center"
          gap={2}
          flexShrink={0}
        >
          {/* NOTIFICACIONES */}
          <Box position="relative">
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
                w={{ base: "300px", md: "360px" }}
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
                A
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
              Administrador
            </Text>
          </Flex>
        </Flex>
      </Flex>
    </Box>
  );
}