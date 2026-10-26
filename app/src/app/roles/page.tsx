"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ShieldCheck, UserPlus } from "lucide-react";
import { Box, Button, Card, Field, Flex, Heading, Input, SimpleGrid, Table, Text } from "@chakra-ui/react";
import type { AppRole } from "../../lib/auth";
import type { AssignableRole, ManagedUser } from "../../lib/cognito-roles";

type ApiResponse = {
  users?: ManagedUser[];
  error?: string;
};

const roleLabels: Record<AppRole, string> = {
  superadmin: "Superadmin",
  admin: "Administrador",
  supervisor: "Supervisor",
  trabajador: "Trabajador",
};

const assignableRoles: AssignableRole[] = ["admin", "supervisor", "trabajador"];

async function getResponseData(response: Response): Promise<ApiResponse> {
  return await response.json().catch(() => ({})) as ApiResponse;
}

export default function RolesPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<AssignableRole>("admin");
  const [roleChanges, setRoleChanges] = useState<Record<string, AssignableRole>>({});
  const [busyEmail, setBusyEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/roles", { cache: "no-store" });
      const data = await getResponseData(response);
      if (!response.ok) throw new Error(data.error || "No se pudieron cargar los roles.");
      setUsers(data.users ?? []);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "No se pudieron cargar los roles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadUsers(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadUsers]);

  const assignRole = async (userEmail: string, role: AssignableRole) => {
    setBusyEmail(userEmail);
    setMessage("");
    try {
      const response = await fetch("/api/admin/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, role }),
      });
      const data = await getResponseData(response);
      if (!response.ok) throw new Error(data.error || "No se pudo actualizar el rol.");
      setMessage(`Rol de ${userEmail} actualizado a ${roleLabels[role]}.`);
      setIsError(false);
      await loadUsers();
      return true;
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el rol.");
      return false;
    } finally {
      setBusyEmail("");
    }
  };

  const addUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (await assignRole(email.trim().toLowerCase(), newRole)) setEmail("");
  };

  return (
    <Box maxW="1200px" mx="auto" px={{ base: 4, md: 6, lg: 8 }} py={{ base: 5, md: 7 }}>
      <Box mb={6}>
        <Flex align="center" gap={2} mb={1}>
          <ShieldCheck size={20} color="#2F507F" />
          <Text fontSize="sm" color="#7A8694">Administración</Text>
        </Flex>
        <Heading size="lg" color="#263238">Roles y permisos</Heading>
        <Text mt={1} fontSize="sm" color="#7A8694">Asigna el nivel de acceso de cada cuenta de FullReports.</Text>
      </Box>

      <Card.Root mb={5} border="1px solid" borderColor="#E8EDF3" borderRadius="8px" bg="white">
        <Card.Body p={{ base: 4, md: 6 }}>
          <Flex align="center" gap={2} mb={2}>
            <UserPlus size={18} color="#2F507F" />
            <Heading size="sm" color="#263238">Agregar correo o cambiar rol</Heading>
          </Flex>
          <Text fontSize="sm" color="#7A8694" mb={4}>
            La persona debe iniciar sesión con Google al menos una vez para que Cognito permita asignarle un rol.
            El superadmin se configura mediante la variable de entorno SUPERADMIN_EMAIL y no se puede cambiar desde aquí.
          </Text>
          <form onSubmit={addUser}>
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={3} alignItems="end">
              <Field.Root required>
                <Field.Label>Correo electrónico</Field.Label>
                <Input
                  type="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="persona@empresa.cl"
                  borderColor="#DCE3EA"
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>Rol</Field.Label>
                <select
                  value={newRole}
                  onChange={(event) => setNewRole(event.target.value as AssignableRole)}
                  style={{ width: "100%", height: "40px", border: "1px solid #DCE3EA", borderRadius: "6px", padding: "0 12px", color: "#263238", background: "white" }}
                >
                  {assignableRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
                </select>
              </Field.Root>
              <Button type="submit" bg="#2F507F" color="white" disabled={!email.trim() || Boolean(busyEmail)}>
                Asignar rol
              </Button>
            </SimpleGrid>
          </form>
          {message && (
            <Text mt={4} fontSize="sm" color={isError ? "#B42318" : "#2F507F"} role={isError ? "alert" : "status"}>
              {message}
            </Text>
          )}
        </Card.Body>
      </Card.Root>

      <Card.Root border="1px solid" borderColor="#E8EDF3" borderRadius="8px" bg="white" overflow="hidden">
        <Card.Header borderBottom="1px solid" borderColor="#E8EDF3" px={{ base: 4, md: 6 }} py={4}>
          <Flex align="center" justify="space-between" gap={3}>
            <Heading size="sm" color="#263238">Cuentas con roles asignados</Heading>
            <Text fontSize="xs" color="#7A8694">{users.length} cuentas</Text>
          </Flex>
        </Card.Header>
        <Box overflowX="auto">
          <Table.Root variant="line" size="md" minW="640px">
            <Table.Header bg="#F8FAFC">
              <Table.Row>
                <Table.ColumnHeader color="#7A8694" fontSize="xs">Correo</Table.ColumnHeader>
                <Table.ColumnHeader color="#7A8694" fontSize="xs">Nombre</Table.ColumnHeader>
                <Table.ColumnHeader color="#7A8694" fontSize="xs">Rol</Table.ColumnHeader>
                <Table.ColumnHeader color="#7A8694" fontSize="xs">Acción</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {users.map((user) => {
                const role = roleChanges[user.email] ?? (user.role === "superadmin" ? "admin" : user.role);
                return (
                  <Table.Row key={user.email}>
                    <Table.Cell><Text fontSize="sm" color="#263238">{user.email}</Text></Table.Cell>
                    <Table.Cell><Text fontSize="sm" color="#52606B">{user.name}</Text></Table.Cell>
                    <Table.Cell>
                      {user.role === "superadmin" ? (
                        <Text fontSize="sm" fontWeight="700" color="#2F507F">{roleLabels.superadmin}</Text>
                      ) : (
                        <select
                          aria-label={`Rol de ${user.email}`}
                          value={role}
                          onChange={(event) => setRoleChanges((current) => ({ ...current, [user.email]: event.target.value as AssignableRole }))}
                          style={{ width: "100%", minWidth: "150px", height: "36px", border: "1px solid #DCE3EA", borderRadius: "6px", padding: "0 10px", color: "#263238", background: "white" }}
                        >
                          {assignableRoles.map((option) => <option key={option} value={option}>{roleLabels[option]}</option>)}
                        </select>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {user.role !== "superadmin" && (
                        <Button
                          size="sm"
                          variant="outline"
                          borderColor="#DCE3EA"
                          color="#2F507F"
                          disabled={busyEmail === user.email || role === user.role}
                          onClick={() => void assignRole(user.email, role)}
                        >
                          Guardar
                        </Button>
                      )}
                    </Table.Cell>
                  </Table.Row>
                );
              })}
              {!loading && users.length === 0 && (
                <Table.Row><Table.Cell colSpan={4} textAlign="center" py={8}><Text color="#7A8694">No hay cuentas con roles asignados.</Text></Table.Cell></Table.Row>
              )}
              {loading && (
                <Table.Row><Table.Cell colSpan={4} textAlign="center" py={8}><Text color="#7A8694">Cargando roles...</Text></Table.Cell></Table.Row>
              )}
            </Table.Body>
          </Table.Root>
        </Box>
      </Card.Root>
    </Box>
  );
}
