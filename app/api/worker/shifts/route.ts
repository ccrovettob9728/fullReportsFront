import { NextRequest, NextResponse } from "next/server";
import { getWorkforceUser, rejectCrossOriginMutation, workforceErrorResponse } from "@/app/src/lib/workforce-auth";
import { endShift, getActiveActivity, startShift } from "@/app/src/lib/workforce-store";

export async function POST(request: NextRequest) {
  const user = await getWorkforceUser(["trabajador"]);
  if (!user) return NextResponse.json({ error: "Esta acción es exclusiva para trabajadores." }, { status: 403 });
  const originError = rejectCrossOriginMutation(request);
  if (originError) return originError;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la solicitud debe ser JSON válido." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("projectId" in body) ||
    !Number.isSafeInteger(body.projectId) || Number(body.projectId) < 1) {
    return NextResponse.json({ error: "La obra asignada no es válida." }, { status: 400 });
  }
  try {
    const shift = await startShift(user.sub, user.email, user.name, Number(body.projectId));
    return NextResponse.json({ shift });
  } catch (error) {
    return workforceErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getWorkforceUser(["trabajador"]);
  if (!user) return NextResponse.json({ error: "Esta acción es exclusiva para trabajadores." }, { status: 403 });
  const originError = rejectCrossOriginMutation(request);
  if (originError) return originError;
  try {
    if (await getActiveActivity(user.sub)) {
      return NextResponse.json({ error: "Finaliza la actividad en curso antes de cerrar tu turno." }, { status: 409 });
    }
    const shift = await endShift(user.sub);
    return NextResponse.json({ shift });
  } catch (error) {
    return workforceErrorResponse(error);
  }
}
