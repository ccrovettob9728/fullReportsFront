import {
  AdminAddUserToGroupCommand,
  AdminListGroupsForUserCommand,
  AdminRemoveUserFromGroupCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
  ListUsersInGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { getAuthConfig, getSuperAdminEmail, roleFromGroups, type AppRole } from "./auth";

export type AssignableRole = Exclude<AppRole, "superadmin">;

const roleGroups: AppRole[] = ["superadmin", "admin", "supervisor", "trabajador"];
const assignableRoles: AssignableRole[] = ["admin", "supervisor", "trabajador"];

export type ManagedUser = {
  sub?: string;
  email: string;
  name: string;
  role: AppRole;
};

export class RoleManagementError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function getRoleClient() {
  const config = getAuthConfig();
  if (!config) {
    throw new RoleManagementError("La configuración de Cognito está incompleta.", 503);
  }
  return {
    client: new CognitoIdentityProviderClient({ region: config.region }),
    userPoolId: config.userPoolId,
  };
}

export async function listManagedUsers(): Promise<ManagedUser[]> {
  const { client, userPoolId } = getRoleClient();
  const usersByEmail = new Map<string, { sub?: string; email: string; name: string; groups: string[] }>();

  for (const group of roleGroups) {
    let nextToken: string | undefined;
    do {
      const response = await client.send(new ListUsersInGroupCommand({
        GroupName: group,
        UserPoolId: userPoolId,
        NextToken: nextToken,
      }));
      for (const user of response.Users ?? []) {
        const attributes = Object.fromEntries(
          (user.Attributes ?? []).flatMap((attribute) => attribute.Name && attribute.Value
            ? [[attribute.Name, attribute.Value]]
            : []),
        );
        const email = attributes.email?.trim().toLowerCase();
        if (!email) continue;
        const existing = usersByEmail.get(email) ?? {
          sub: attributes.sub,
          email,
          name: attributes.name?.trim() || email,
          groups: [],
        };
        existing.sub ??= attributes.sub;
        if (!existing.groups.includes(group)) existing.groups.push(group);
        usersByEmail.set(email, existing);
      }
      nextToken = response.NextToken;
    } while (nextToken);
  }

  const superAdminEmail = getSuperAdminEmail();
  if (superAdminEmail && !usersByEmail.has(superAdminEmail)) {
    usersByEmail.set(superAdminEmail, {
      email: superAdminEmail,
      name: superAdminEmail,
      groups: [],
    });
  }

  return [...usersByEmail.values()]
    .map(({ sub, email, name, groups }) => ({ sub, email, name, role: roleFromGroups(groups, email) }))
    .sort((first, second) => first.email.localeCompare(second.email));
}

export async function assignUserRole(email: string, role: AssignableRole) {
  if (!assignableRoles.includes(role)) {
    throw new RoleManagementError("El rol seleccionado no es válido.", 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new RoleManagementError("Ingresa un correo electrónico válido.", 400);
  }
  if (email === getSuperAdminEmail()) {
    throw new RoleManagementError("El superadmin configurado no puede cambiar de rol.", 400);
  }

  const { client, userPoolId } = getRoleClient();
  const usersResponse = await client.send(new ListUsersCommand({
    UserPoolId: userPoolId,
    Filter: `email = "${email}"`,
    Limit: 10,
  }));
  const user = usersResponse.Users?.find((candidate) =>
    candidate.Attributes?.some((attribute) =>
      attribute.Name === "email" && attribute.Value?.trim().toLowerCase() === email,
    ),
  );
  if (!user?.Username) {
    throw new RoleManagementError("No encontramos esa cuenta en Cognito. Debe iniciar sesión con Google al menos una vez.", 404);
  }

  const userGroups: string[] = [];
  let nextToken: string | undefined;
  do {
    const response = await client.send(new AdminListGroupsForUserCommand({
      Username: user.Username,
      UserPoolId: userPoolId,
      NextToken: nextToken,
    }));
    userGroups.push(...(response.Groups ?? []).flatMap((group) => group.GroupName ? [group.GroupName] : []));
    nextToken = response.NextToken;
  } while (nextToken);

  if (userGroups.includes("superadmin")) {
    throw new RoleManagementError("No se puede cambiar el rol de una cuenta superadmin.", 400);
  }

  const existingRoleGroups = userGroups.filter((group) => roleGroups.includes(group as AppRole) && group !== "superadmin");
  const addedNewRole = !existingRoleGroups.includes(role);
  try {
    if (addedNewRole) {
      await client.send(new AdminAddUserToGroupCommand({
        GroupName: role,
        Username: user.Username,
        UserPoolId: userPoolId,
      }));
    }
    for (const group of existingRoleGroups) {
      if (group !== role) {
        await client.send(new AdminRemoveUserFromGroupCommand({
          GroupName: group,
          Username: user.Username,
          UserPoolId: userPoolId,
        }));
      }
    }
  } catch (error) {
    try {
      if (addedNewRole) {
        await client.send(new AdminRemoveUserFromGroupCommand({
          GroupName: role,
          Username: user.Username,
          UserPoolId: userPoolId,
        }));
      }
      for (const group of existingRoleGroups) {
        if (group !== role) {
          await client.send(new AdminAddUserToGroupCommand({
            GroupName: group,
            Username: user.Username,
            UserPoolId: userPoolId,
          }));
        }
      }
    } catch (rollbackError) {
      console.error("No se pudieron restaurar los grupos de Cognito tras un error de asignación de rol.", rollbackError);
    }
    throw error;
  }
}
