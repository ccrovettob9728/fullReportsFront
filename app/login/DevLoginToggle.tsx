"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Flex, Text } from "@chakra-ui/react";

interface DevLoginToggleProps {
  enabled: boolean;
}

export default function DevLoginToggle({ enabled: initialEnabled }: DevLoginToggleProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleToggle = async () => {
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      if (!response.ok) throw new Error("No se pudo cambiar el modo local.");

      const nextEnabled = !enabled;
      setEnabled(nextEnabled);
      if (nextEnabled) {
        router.refresh();
      } else {
        router.replace("/obras");
      }
    } catch {
      setError("No se pudo cambiar el modo local. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box mt={6} p={4} border="1px solid #E2C477" bg="#FFF9E8" borderRadius="6px">
      <Flex align="center" justify="space-between" gap={4}>
        <Box>
          <Text fontSize="sm" fontWeight="700" color="#493B19">Modo local de autenticación</Text>
          <Text mt={1} fontSize="xs" color="#74643D">
            {enabled
              ? "El login real requiere Cognito configurado"
              : "Acceso sin sesión para probar la interfaz local"}
          </Text>
        </Box>
        <Button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={enabled ? "Login ON" : "Login OFF"}
          onClick={handleToggle}
          disabled={saving}
          size="sm"
          minW="104px"
          bg={enabled ? "#2E7D5B" : "#B18419"}
          color="white"
          _hover={{ opacity: 0.9 }}
        >
          Login {enabled ? "ON" : "OFF"}
        </Button>
      </Flex>
      {error && <Text mt={2} role="alert" fontSize="xs" color="#B42318">{error}</Text>}
    </Box>
  );
}