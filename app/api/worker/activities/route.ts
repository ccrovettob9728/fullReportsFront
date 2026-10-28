import { NextRequest, NextResponse } from "next/server";
import { getWorkforceUser, rejectCrossOriginMutation, workforceErrorResponse } from "@/app/src/lib/workforce-auth";
import { endActivity, startActivity } from "@/app/src/lib/workforce-store";

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
  if (!body || typeof body !== "object" || !("projectId" in body) || !("taskId" in body) ||
    !Number.isSafeInteger(body.projectId) || Number(body.projectId) < 1 ||
    !Number.isSafeInteger(body.taskId) || Number(body.taskId) < 1 ||
    !("machineId" in body) || (body.machineId !== null && typeof body.machineId !== "string") ||
    !("comment" in body) || typeof body.comment !== "string" || body.comment.length > 1000) {
    return NextResponse.json({ error: "Los datos de la actividad no son válidos." }, { status: 400 });
  }
  try {
    const activity = await startActivity(
      user.sub,
      user.email,
      user.name,
      Number(body.projectId),
      Number(body.taskId),
      body.machineId,
      body.comment.trim(),
    );
    return NextResponse.json({ activity });
  } catch (error) {
    return workforceErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
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
  if (!body || typeof body !== "object" || !("comment" in body) ||
    typeof body.comment !== "string" || body.comment.length > 1000) {
    return NextResponse.json({ error: "El comentario debe tener hasta 1000 caracteres." }, { status: 400 });
  }
  try {
    const activity = await endActivity(user.sub, body.comment.trim());
    return NextResponse.json({ activity });
  } catch (error) {
    return workforceErrorResponse(error);
  }
}
