import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthConfig } from "@/app/src/lib/auth";

function safeReturnTo(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/login")) {
    return "/obras";
  }
  return value;
}

export async function GET(request: NextRequest) {
  const config = getAuthConfig();
  if (!config) {
    return NextResponse.redirect(new URL("/login?error=configuration", request.url));
  }

  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const authorizeUrl = new URL(`${config.domain}/oauth2/authorize`);
  authorizeUrl.search = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: "openid email profile",
    identity_provider: "Google",
    prompt: "select_account",
    state,
    code_challenge_method: "S256",
    code_challenge: challenge,
  }).toString();

  const response = NextResponse.redirect(authorizeUrl);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  response.cookies.set("fullreports-oauth-state", state, cookieOptions);
  response.cookies.set("fullreports-pkce-verifier", verifier, cookieOptions);
  response.cookies.set("fullreports-return-to", safeReturnTo(request.nextUrl.searchParams.get("returnTo")), cookieOptions);
  return response;
}