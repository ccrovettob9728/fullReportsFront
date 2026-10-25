import { NextRequest, NextResponse } from "next/server";
import { getAuthConfig, SESSION_COOKIE, verifySessionToken } from "@/app/src/lib/auth";

export async function GET(request: NextRequest) {
  const config = getAuthConfig();
  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");
  const errorDescription = request.nextUrl.searchParams.get("error_description");
  const returnedState = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("fullreports-oauth-state")?.value;
  const verifier = request.cookies.get("fullreports-pkce-verifier")?.value;
  const returnTo = request.cookies.get("fullreports-return-to")?.value ?? "/obras";

  if (oauthError) {
    const error = errorDescription === "invalid_scope" ? "scope" : "identity";
    return NextResponse.redirect(new URL(`/login?error=${error}`, request.url));
  }

  if (!config || !code || !returnedState || !expectedState || returnedState !== expectedState || !verifier) {
    return NextResponse.redirect(new URL("/login?error=callback", request.url));
  }

  try {
    const tokenResponse = await fetch(`${config.domain}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: config.clientId,
        code,
        redirect_uri: config.redirectUri,
        code_verifier: verifier,
      }),
      cache: "no-store",
    });

    if (!tokenResponse.ok) throw new Error("Cognito token exchange failed");
    const tokens = (await tokenResponse.json()) as { id_token?: string; expires_in?: number };
    if (!tokens.id_token) throw new Error("Cognito did not return an ID token");

    const user = await verifySessionToken(tokens.id_token);
    if (!user) throw new Error("Cognito ID token is invalid");

    const response = NextResponse.redirect(new URL(returnTo, request.url));
    response.cookies.set(SESSION_COOKIE, tokens.id_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.min(tokens.expires_in ?? 3600, 3600),
    });
    response.cookies.delete("fullreports-oauth-state");
    response.cookies.delete("fullreports-pkce-verifier");
    response.cookies.delete("fullreports-return-to");
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=exchange", request.url));
  }
}