import Link from "next/link";
import { Box, Button, Heading, Text } from "@chakra-ui/react";

export default function AccessDeniedPage() {
  return (
    <Box maxW="560px" mx="auto" px={6} py={{ base: 16, md: 24 }}>
      <Text color="#C2414B" fontSize="sm" fontWeight="700">403 · ACCESO RESTRINGIDO</Text>
      <Heading mt={3} color="#263238" size="lg">Tu rol no permite ver esta sección.</Heading>
      <Text mt={3} color="#6F7C89" fontSize="sm">Si necesitas acceso, solicita al administrador que actualice tu grupo de Cognito.</Text>
      <Button asChild mt={6} bg="#2F507F" color="white">
        <Link href="/dashboard">Volver al dashboard</Link>
      </Button>
    </Box>
  );
}