import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "fullreports-dev-login";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }

  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return new NextResponse(null, { status: 403 });
  }

  let enabled: unknown;
  try {
    ({ enabled } = await request.json());
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "Se esperaba enabled boolean" }, { status: 400 });
  }

  const response = NextResponse.json({ enabled });
  if (enabled) {
    response.cookies.delete(COOKIE_NAME);
  } else {
    response.cookies.set(COOKIE_NAME, "off", {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  }
  return response;
}