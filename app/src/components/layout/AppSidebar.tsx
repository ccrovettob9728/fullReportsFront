"use client";

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
  onToggle: () => void;
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
  onToggle,
}: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Overlay solamente en mobile */}
      {open && (
        <Box
          display={{
            base: "block",
            lg: "none",
          }}
          position="fixed"
          inset="0"
          bg="blackAlpha.500"
          zIndex={998}
          onClick={onClose}
        />
      )}

      {/* SIDEBAR */}
      <Box
        as="aside"
        position={{
          base: "fixed",
          lg: "fixed",
        }}
        left={{
          base: open ? "0" : "-260px",
          lg: open ? "0" : "-250px",
        }}
        top="0"
        bottom="0"
        zIndex={999}
        w="250px"
        flexShrink={0}
        bg="#F1F4F7"
        transition="left .25s ease"
        display={{
          base: "block",
          lg: open ? "block" : "none",
        }}
      >
        {/* HEADER SIDEBAR */}
        <Flex
          h="64px"
          px={5}
          align="center"
          justify="space-between"
        >
          <Flex
            align="center"
            gap={3}
          >
            <Box
              w="184px"
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
                width={174}
                height={34}
                priority
                style={{ objectFit: "contain" }}
              />
            </Box>
          </Flex>
        </Flex>

        {/* MENU */}
        <Box
          px={3}
          py={5}
          pb="80px"
        >
          <Text
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
            {menuItems.map((item) => {
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

        {/* BOTÓN PARA CERRAR */}
        <Box
          position="absolute"
          bottom="20px"
          right="-14px"
          zIndex={1000}
        >
          <IconButton
            aria-label="Ocultar menú"
            onClick={onToggle}
            size="xs"
            w="28px"
            h="28px"
            minW="28px"
            borderRadius="full"
            bg="white"
            border="1px solid"
            borderColor="#E0E6ED"
            boxShadow="0 2px 8px rgba(38, 50, 56, 0.08)"
            color="#66727F"
            _hover={{
              color: "#2F507F",
              borderColor: "#C9D6E5",
              boxShadow:
                "0 4px 12px rgba(38, 50, 56, 0.12)",
            }}
          >
            <ChevronLeft size={15} />
          </IconButton>
        </Box>
      </Box>
    </>
  );
}