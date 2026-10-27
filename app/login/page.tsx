import { cookies } from "next/headers";
import { Box, Button, Flex, Heading, Text } from "@chakra-ui/react";
import DevLoginToggle from "./DevLoginToggle";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; returnTo?: string }>;
};

const errorMessages: Record<string, string> = {
  configuration: "El inicio de sesión aún no está configurado. Contacta al administrador.",
  callback: "No pudimos validar la respuesta de autenticación. Intenta nuevamente.",
  exchange: "No pudimos completar el inicio de sesión con Google. Intenta nuevamente.",
  scope: "Cognito rechazó los ámbitos solicitados. En el App client habilita OpenID, Correo electrónico y Perfil en los ámbitos de OAuth permitidos.",
  identity: "Google o Cognito rechazaron el inicio de sesión. Revisa que Google esté habilitado en el App client y vuelve a intentarlo.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const isDevelopment = process.env.NODE_ENV === "development";
  const cookieStore = isDevelopment ? await cookies() : null;
  const devLoginEnabled = cookieStore?.get("fullreports-dev-login")?.value !== "off";
  const returnTo = params.returnTo?.startsWith("/") && !params.returnTo.startsWith("//")
    ? params.returnTo
    : "/obras";

  return (
    <Box minH="100vh" display="grid" gridTemplateColumns={{ base: "1fr", lg: "1.1fr 0.9fr" }} bg="#F7F9FC">
      <Flex
        minH={{ base: "220px", lg: "100vh" }}
        bg="#263B54"
        color="white"
        px={{ base: 8, md: 14, lg: 20 }}
        py={{ base: 10, lg: 16 }}
        direction="column"
        justify="space-between"
      >
        <Text fontSize="sm" fontWeight="800" letterSpacing="0.12em">FULLREPORTS</Text>
        <Box maxW="560px" py={{ base: 6, lg: 0 }}>
          <Text color="#B8C9D7" fontSize="sm" fontWeight="700" textTransform="uppercase">Gestión de proyectos</Text>
          <Heading mt={4} fontSize={{ base: "3xl", md: "5xl" }} lineHeight="1.08" fontWeight="700">
            Cada avance, bajo control.
          </Heading>
          <Text mt={5} color="#D2DDE6" fontSize="md" maxW="440px" lineHeight="1.7">
            Ingresa para revisar tus obras, tareas e informes de seguimiento.
          </Text>
        </Box>
        <Text display={{ base: "none", lg: "block" }} color="#B8C9D7" fontSize="xs">Seguimiento claro para equipos en terreno.</Text>
      </Flex>

      <Flex minH={{ base: "calc(100vh - 220px)", lg: "100vh" }} align="center" justify="center" px={6} py={12}>
        <Box w="100%" maxW="420px">
          <Text fontSize="sm" color="#2F507F" fontWeight="700">Acceso seguro</Text>
          <Heading mt={2} color="#263238" fontSize="2xl">Iniciar sesión</Heading>
          <Text mt={2} color="#6F7C89" fontSize="sm">
            Usa tu cuenta de Google para continuar. Podrás elegir qué cuenta usar.
          </Text>

          {params.error && (
            <Box role="alert" mt={5} borderLeft="3px solid #C2414B" bg="#FBEAEC" px={4} py={3}>
              <Text color="#8F2731" fontSize="sm">{errorMessages[params.error] ?? "Ocurrió un error al iniciar sesión."}</Text>
            </Box>
          )}

          {isDevelopment && <DevLoginToggle enabled={devLoginEnabled} />}

          {(!isDevelopment || devLoginEnabled) && <Button
            asChild
            mt={isDevelopment ? 5 : 8}
            w="100%"
            h="48px"
            bg="#2F507F"
            color="white"
            borderRadius="6px"
            _hover={{ bg: "#263B54" }}
          >
            <a href={`/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`}>
              <GoogleMark />
              Continuar con Google
            </a>
          </Button>}
          <Text mt={5} textAlign="center" fontSize="xs" color="#8793A0">
            El acceso y los permisos son administrados por FullReports.
          </Text>
        </Box>
      </Flex>
    </Box>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48" fill="none">
      <path fill="#FFC107" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-8.8 6-15Z" />
      <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.1c-1.8 1.2-4.1 1.9-6.8 1.9-5.2 0-9.6-3.5-11.2-8.2H5.9v5.2A20 20 0 0 0 24 44Z" />
      <path fill="#4A90E2" d="M12.8 27.7a12 12 0 0 1 0-7.4v-5.2H5.9a20 20 0 0 0 0 17.8l6.9-5.2Z" />
      <path fill="#EA4335" d="M24 12.1c3 0 5.7 1 7.8 3.1l5.9-5.9A19.7 19.7 0 0 0 24 4 20 20 0 0 0 5.9 15.1l6.9 5.2c1.6-4.7 6-8.2 11.2-8.2Z" />
    </svg>
  );
}