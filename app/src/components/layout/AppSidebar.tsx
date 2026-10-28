"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import {
  BarChart3,
  Building2,
  ChevronLeft,
  ClipboardList,
  FileText,
  Home,
  Milestone,
  Settings,
  CalendarDays,
  ListTodo,
  FileSpreadsheet,
  ShieldCheck,
} from "lucide-react";

import {
  Box,
  Flex,
  IconButton,
  Text,
  VStack,
} from "@chakra-ui/react";

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

const menuItems = [
  {
    label: "Obras",
    href: "/obras",
    icon: Building2,
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    label: "Tareas",
    href: "/tareas",
    icon: ClipboardList,
  },
  {
    label: "Programa de obra",
    href: "/programa",
    icon: FileSpreadsheet,
  },
  {
    label: "Asistencia",
    href: "/asistencia",
    icon: CalendarDays,
  },
  {
    label: "Actividades",
    href: "/actividades",
    icon: ListTodo,
  },
  {
    label: "Reportes",
    href: "/reportes",
    icon: FileText,
  },
  {
    label: "Indicadores",
    href: "/indicadores",
    icon: BarChart3,
  },
  {
    label: "Hitos",
    href: "/hitos",
    icon: Milestone,
  },
  {
    label: "Configuración",
    href: "/configuracion",
    icon: Settings,
  },
];

export default function AppSidebar({
  open,
  onClose,
}: AppSidebarProps) {
  const pathname = usePathname();
  const [role, setRole] = useState("");
  const [roleReady, setRoleReady] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { user?: { role?: string } | null }) => setRole(data.user?.role ?? ""))
      .catch(() => setRole(""))
      .finally(() => setRoleReady(true));
  }, []);
  const visibleMenuItems = !roleReady
    ? []
    : role === "trabajador"
    ? menuItems.filter((item) => ["/dashboard", "/asistencia", "/actividades"].includes(item.href))
    : role === "superadmin"
    ? [...menuItems, { label: "Roles", href: "/roles", icon: ShieldCheck }]
    : menuItems;

  return (
    <>
      {/* Overlay solamente en mobile cuando se usa como panel */}
      <Box
        className="app-sidebar-overlay"
        display={{ base: "block", lg: "none" }}
        position="fixed"
        inset="0"
        bg="blackAlpha.500"
        zIndex={998}
        opacity={open ? 1 : 0}
        visibility={open ? "visible" : "hidden"}
        pointerEvents={open ? "auto" : "none"}
        transition="opacity .38s cubic-bezier(0.22, 1, 0.36, 1), visibility .38s"
        onClick={onClose}
        aria-hidden={!open}
      />

      {/* SIDEBAR */}
      <Box
        className="app-sidebar"
        as="aside"
        position={{
          base: "fixed",
          lg: "fixed",
        }}
        left={{
          base: open ? "0" : "-220px",
          lg: open ? "0" : "-220px",
        }}
        visibility={{ base: "visible", lg: open ? "visible" : "hidden" }}
        pointerEvents={{ base: open ? "auto" : "none", lg: open ? "auto" : "none" }}
        top="0"
        bottom="0"
        zIndex={999}
        w="220px"
        flexShrink={0}
        bg="#F1F4F7"
        transition="left .38s cubic-bezier(0.22, 1, 0.36, 1), visibility .38s"
      >
        {/* HEADER SIDEBAR */}
        <Flex
          h="64px"
          px={3}
          align="center"
          justify="space-between"
        >
          <Flex
            align="center"
            gap={3}
          >
            <Box
              w={{ base: "140px", lg: "132px" }}
              flexShrink={1}
              h="42px"
              borderRadius="10px"
              bg="#263B54"
              display="flex"
              alignItems="center"
              justifyContent="center"
              overflow="hidden"
            >
              <Image
                src="/logo.png"
                alt="FullReports"
                width={164}
                height={34}
                priority
                style={{ width: "100%", height: "auto", objectFit: "contain", padding: "0 6px" }}
              />
            </Box>
          </Flex>
          <IconButton
            aria-label="Cerrar menú lateral"
            title="Cerrar menú lateral"
            onClick={onClose}
            display="inline-flex"
            flexShrink={0}
            w={{ base: "44px", lg: "40px" }}
            h={{ base: "44px", lg: "40px" }}
            minW={{ base: "44px", lg: "40px" }}
            borderRadius="12px"
            bg="#2F507F"
            color="white"
            boxShadow="0 4px 12px rgba(47, 80, 127, 0.24)"
            _hover={{ bg: "#263B54", boxShadow: "0 6px 16px rgba(47, 80, 127, 0.3)" }}
            _active={{ transform: "scale(0.96)" }}
            _focusVisible={{ outline: "3px solid #78C8E2", outlineOffset: "2px" }}
          >
            <ChevronLeft size={23} strokeWidth={2.5} />
          </IconButton>
        </Flex>

        {/* MENU */}
        <Box
          px={3}
          py={5}
          pb="80px"
          maxH="calc(100dvh - 64px)"
          overflowY="auto"
        >
          <Text
            display="block"
            fontSize="10px"
            fontWeight="700"
            color="#8793A0"
            textTransform="uppercase"
            letterSpacing="0.08em"
            px={3}
            mb={2}
          >
            Principal
          </Text>

          <VStack
            align="stretch"
            gap={1}
          >
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;

              const active =
                pathname === item.href ||
                pathname.startsWith(
                  `${item.href}/`
                );

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    textDecoration: "none",
                  }}
                >
                  <Flex
                    align="center"
                    gap={3}
                    px={3}
                    py={2.5}
                    borderRadius="8px"
                    justifyContent="flex-start"
                    title={item.label}
                    bg={
                      active
                        ? "#DDE7F0"
                        : "transparent"
                    }
                    color={
                      active
                        ? "#294C70"
                        : "#5F6D7A"
                    }
                    transition="all .15s"
                    _hover={{
                      bg: "#E5EBF0",
                      color: "#2F507F",
                    }}
                  >
                    <Icon
                      size={17}
                      strokeWidth={1.8}
                    />

                    <Text
                      display="block"
                      fontSize="sm"
                      fontWeight={
                        active
                          ? "600"
                          : "500"
                      }
                    >
                      {item.label}
                    </Text>
                  </Flex>
                </Link>
              );
            })}
          </VStack>
        </Box>

      </Box>
    </>
  );
}