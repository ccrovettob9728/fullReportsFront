import { NextResponse } from "next/server";
import { getWorkforceUser, workforceErrorResponse } from "@/app/src/lib/workforce-auth";
import {
  getActiveActivity,
  getActiveShift,
  listProjectMachines,
  listProjectTasks,
  listWorkerActivities,
  listWorkerProjects,
  listWorkerShifts,
} from "@/app/src/lib/workforce-store";

export async function GET() {
  const user = await getWorkforceUser(["trabajador"]);
  if (!user) return NextResponse.json({ error: "Esta información es exclusiva para trabajadores." }, { status: 403 });
  try {
    const projects = await listWorkerProjects(user.sub);
    if (projects.length > 1) {
      return NextResponse.json({ error: "Tu cuenta tiene más de una obra asignada. Contacta al administrador para corregirlo." }, { status: 409 });
    }
    const project = projects[0] ?? null;
    if (!project) {
      return NextResponse.json({
        project: null,
        tasks: [],
        machines: [],
        activeShift: null,
        activeActivity: null,
        shifts: [],
        activities: [],
      }, { headers: { "Cache-Control": "no-store" } });
    }
    const [tasks, machines, activeShift, activeActivity, shifts, activities] = await Promise.all([
      listProjectTasks(project.id),
      listProjectMachines(project.id),
      getActiveShift(user.sub),
      getActiveActivity(user.sub),
      listWorkerShifts(user.sub),
      listWorkerActivities(user.sub),
    ]);
    return NextResponse.json({
      project: { ...project, assignedWorkers: [] },
      tasks,
      machines: machines.filter((machine) => machine.active),
      activeShift: activeShift ? {
        id: activeShift.id,
        projectId: activeShift.projectId,
        workerEmail: activeShift.workerEmail,
        workerName: activeShift.workerName,
        startedAt: activeShift.startedAt,
      } : null,
      activeActivity: activeActivity ? {
        id: activeActivity.id,
        projectId: activeActivity.projectId,
        taskId: activeActivity.taskId,
        taskTitle: activeActivity.taskTitle,
        machineId: activeActivity.machineId,
        machineName: activeActivity.machineName,
        comment: activeActivity.comment,
        startedAt: activeActivity.startedAt,
      } : null,
      shifts: shifts.filter((shift) => shift.projectId === project.id),
      activities: activities.filter((activity) => activity.projectId === project.id),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return workforceErrorResponse(error);
  }
}
