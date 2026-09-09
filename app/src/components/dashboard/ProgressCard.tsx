"use client";

import { ArrowUpRight } from "lucide-react";
import { Box, Card, Flex, Text } from "@chakra-ui/react";

interface ProgressCardProps {
  title: string;
  completed: number;
  total: number;
  color: string;
  background: string;
  labelCompleted: string;
  period: string;
  onClick?: () => void;
}

export default function ProgressCard({
  title,
  completed,
  total,
  color,
  background,
  labelCompleted,
  period,
  onClick,
}: ProgressCardProps) {
  const percentage =
    total > 0
      ? Math.min(100, Math.round((completed / total) * 100))
      : 0;

  return (
    <Card.Root
      position="relative"
      overflow="hidden"
      minH="175px"
      borderRadius="18px"
      border="1px solid"
      borderColor={`${color}35`}
      bg={background}
      boxShadow="0 4px 16px rgba(38, 50, 56, 0.04)"
      cursor={onClick ? "pointer" : "default"}
      transition="all 0.2s ease"
      onClick={onClick}
      _hover={
        onClick
          ? {
              transform: "translateY(-2px)",
              boxShadow: "0 8px 24px rgba(38, 50, 56, 0.09)",
            }
          : undefined
      }
    >
      {/* Progreso horizontal */}
      <Box
        position="absolute"
        top="0"
        left="0"
        bottom="0"
        width={`${percentage}%`}
        bg={color}
        opacity={0.13}
        transition="width 0.5s ease"
      />

      {/* Línea que marca el porcentaje */}
      {percentage > 0 && percentage < 100 && (
        <Box
          position="absolute"
          top="16px"
          bottom="16px"
          left={`${percentage}%`}
          width="2px"
          bg={color}
          opacity={0.55}
        />
      )}

      <Card.Body
        position="relative"
        zIndex={1}
        p={5}
      >
        <Flex
          direction="column"
          justify="space-between"
          minH="135px"
        >
          {/* Header */}
          <Flex
            align="center"
            justify="space-between"
          >
            <Flex align="center" gap={2}>
              <Box
                w="8px"
                h="8px"
                borderRadius="full"
                bg={color}
              />

              <Text
                fontSize="sm"
                fontWeight="700"
                color="#263238"
              >
                {title}
              </Text>
            </Flex>

            <Flex
              align="center"
              gap={1}
              color={color}
            >
              <Text
                fontSize="xs"
                fontWeight="600"
              >
                {period}
              </Text>

              <ArrowUpRight size={15} />
            </Flex>
          </Flex>

          {/* Porcentaje */}
          <Flex
            align="baseline"
            gap={2}
            mt={5}
          >
            <Text
              fontSize="42px"
              lineHeight="1"
              fontWeight="800"
              letterSpacing="-0.04em"
              color={color}
            >
              {percentage}%
            </Text>

            <Text
              fontSize="xs"
              fontWeight="500"
              color="#5F6B76"
            >
              completado
            </Text>
          </Flex>

          {/* Footer */}
          <Flex
            align="center"
            justify="space-between"
            mt={5}
          >
            <Text
              fontSize="xs"
              color="#52606B"
            >
              {completed} de {total} {labelCompleted}
            </Text>

            <Text
              fontSize="xs"
              fontWeight="700"
              color={color}
            >
              {percentage === 100
                ? "Completado"
                : "Ver detalle"}
            </Text>
          </Flex>
        </Flex>
      </Card.Body>
    </Card.Root>
  );
}