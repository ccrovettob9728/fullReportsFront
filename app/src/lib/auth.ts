import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

export const SESSION_COOKIE = "fullreports-session";

export type AppRole = "admin" | "superadmin" | "supervisor" | "trabajador";

export interface AuthenticatedUser {
  sub: string;
  email: string;
  name: string;
  role: AppRole;
}

export function getSuperAdminEmail() {
  return process.env.SUPERADMIN_EMAIL?.trim().toLowerCase() ?? "";
}

function getCognitoConfig() {
  const region = process.env.COGNITO_REGION;
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;
  const domain = process.env.COGNITO_DOMAIN?.replace(/\/$/, "");
  const redirectUri = process.env.COGNITO_REDIRECT_URI;
  const logoutUri = process.env.COGNITO_LOGOUT_URI;

  if (!region || !userPoolId || !clientId || !domain || !redirectUri || !logoutUri) {
    return null;
  }

  return {
    region,
    userPoolId,
    clientId,
    domain,
    redirectUri,
    logoutUri,
    issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
  };
}

export function getAuthConfig() {
  return getCognitoConfig();
}

export function roleFromGroups(groups: unknown, email = ""): AppRole {
  const superAdminEmail = getSuperAdminEmail();
  if (superAdminEmail && email.trim().toLowerCase() === superAdminEmail) return "superadmin";
  if (!Array.isArray(groups)) return "trabajador";
  const normalizedGroups = groups.filter((group): group is string => typeof group === "string");
  const precedence: AppRole[] = ["superadmin", "admin", "supervisor", "trabajador"];
  return precedence.find((role) => normalizedGroups.includes(role)) ?? "trabajador";
}

export function canAccessPath(role: AppRole, pathname: string) {
  const normalizedPath = pathname.startsWith("/src/app/")
    ? pathname.slice("/src/app".length)
    : pathname;
  const isRolesRoute = normalizedPath === "/roles" || normalizedPath.startsWith("/roles/");
  const isRolesApi = normalizedPath === "/api/admin/roles" || normalizedPath.startsWith("/api/admin/roles/");
  if (isRolesRoute || isRolesApi) return role === "superadmin";
  if (role === "superadmin" || role === "admin") return true;
  if (role === "supervisor") return normalizedPath !== "/configuracion" && !normalizedPath.startsWith("/configuracion/");
  if (normalizedPath === "/sin-acceso" || normalizedPath.startsWith("/sin-acceso/")) return true;
  return ["/dashboard", "/tareas", "/reportes"].some(
    (route) => normalizedPath === route || normalizedPath.startsWith(`${route}/`),
  );
}

function toAuthenticatedUser(payload: JWTPayload): AuthenticatedUser | null {
  if (typeof payload.sub !== "string") return null;
  const email = typeof payload.email === "string" ? payload.email : "";
  if (!email) return null;

  return {
    sub: payload.sub,
    email,
    name: typeof payload.name === "string" ? payload.name : email,
    role: roleFromGroups(payload["cognito:groups"], email),
  };
}

export async function verifySessionToken(token: string): Promise<AuthenticatedUser | null> {
  const config = getCognitoConfig();
  if (!config) return null;

  try {
    const jwks = createRemoteJWKSet(
      new URL(`${config.issuer}/.well-known/jwks.json`),
    );
    const { payload } = await jwtVerify(token, jwks, {
      issuer: config.issuer,
      audience: config.clientId,
      algorithms: ["RS256"],
    });
    if (payload.token_use !== "id") return null;
    return toAuthenticatedUser(payload);
  } catch {
    return null;
  }
}
