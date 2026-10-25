import { NextRequest, NextResponse } from "next/server";
import { getAuthConfig, SESSION_COOKIE } from "@/app/src/lib/auth";

export async function GET(request: NextRequest) {
  const config = getAuthConfig();
  const response = config
    ? NextResponse.redirect(
        `${config.domain}/logout?${new URLSearchParams({
          client_id: config.clientId,
          logout_uri: config.logoutUri,
        })}`,
      )
    : NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}