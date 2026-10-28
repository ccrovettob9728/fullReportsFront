import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  DeleteCommand,
  type QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import type { ProjectTask } from "../data/tasks";
import type { Project } from "../types/project";
import type { AssignedWorker, ProjectMachine, ShiftRecord, WorkerActivity, WorkforceProject } from "../types/workforce";
export type { AssignedWorker, ProjectMachine, ShiftRecord, WorkerActivity, WorkforceProject } from "../types/workforce";

type StoreItem = Record<string, unknown> & { PK: string; SK: string };
let documentClient: DynamoDBDocumentClient | undefined;

export class WorkforceStoreError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function getStore() {
  const tableName = process.env.DYNAMODB_TABLE_NAME;
  if (!tableName) {
    throw new WorkforceStoreError("Falta configurar DYNAMODB_TABLE_NAME.", 503);
  }
  documentClient ??= DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: process.env.COGNITO_REGION ?? process.env.AWS_REGION }),
    { marshallOptions: { removeUndefinedValues: true } },
  );
  return { client: documentClient, tableName };
}

function projectKey(projectId: number) {
  return `PROJECT#${projectId}`;
}

function asProject(item: StoreItem): WorkforceProject {
  return {
    id: Number(item.id),
    name: String(item.name),
    description: String(item.description),
    status: item.status as Project["status"],
    startDate: typeof item.startDate === "string" ? item.startDate : undefined,
    plannedEndDate: typeof item.plannedEndDate === "string" ? item.plannedEndDate : undefined,
    assignedWorkers: Array.isArray(item.assignedWorkers)
      ? item.assignedWorkers as AssignedWorker[]
      : [],
    workforceUsed: item.workforceUsed === true,
  };
}

function asShift(item: StoreItem): ShiftRecord {
  return {
    id: String(item.id),
    projectId: Number(item.projectId),
    workerEmail: String(item.workerEmail),
    workerName: String(item.workerName),
    startedAt: String(item.startedAt),
    endedAt: typeof item.endedAt === "string" ? item.endedAt : "",
    durationSeconds: Number(item.durationSeconds ?? 0),
  };
}

function asActivity(item: StoreItem): WorkerActivity {
  return {
    id: String(item.id),
    projectId: Number(item.projectId),
    taskId: Number(item.taskId),
    taskTitle: String(item.taskTitle),
    workerEmail: String(item.workerEmail),
    workerName: String(item.workerName),
    machineId: typeof item.machineId === "string" ? item.machineId : null,
    machineName: typeof item.machineName === "string" ? item.machineName : null,
    comment: typeof item.comment === "string" ? item.comment : "",
    startedAt: String(item.startedAt),
    endedAt: typeof item.endedAt === "string" ? item.endedAt : undefined,
    durationSeconds: typeof item.durationSeconds === "number" ? item.durationSeconds : undefined,
  };
}

async function queryAll(input: Omit<QueryCommandInput, "TableName" | "ExclusiveStartKey">) {
  const { client, tableName } = getStore();
  const items: StoreItem[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;
  do {
    const response = await client.send(new QueryCommand({
      ...input,
      TableName: tableName,
      ...(lastEvaluatedKey ? { ExclusiveStartKey: lastEvaluatedKey } : {}),
    }));
    for (const item of response.Items ?? []) items.push(item as StoreItem);
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  return items;
}

async function queryPartition(pk: string, skPrefix: string) {
  return queryAll({
    ConsistentRead: true,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
    ExpressionAttributeValues: { ":pk": pk, ":prefix": skPrefix },
  });
}

export async function getProject(projectId: number) {
  const { client, tableName } = getStore();
  const response = await client.send(new GetCommand({
    TableName: tableName,
    Key: { PK: projectKey(projectId), SK: "METADATA" },
    ConsistentRead: true,
  }));
  return response.Item ? asProject(response.Item as StoreItem) : null;
}

export async function listProjects() {
  const items = await queryAll({
    IndexName: "GSI1",
    KeyConditionExpression: "GSI1PK = :pk",
    ExpressionAttributeValues: { ":pk": "PROJECT" },
  });
  return items.map(asProject);
}

export async function listWorkerProjects(sub: string) {
  const assignments = await queryPartition(`USER#${sub}`, "ASSIGNMENT");
  const projects = await Promise.all(assignments.map((item) => getProject(Number(item.projectId))));
  return projects.filter((project): project is WorkforceProject => project !== null);
}

export async function saveProject(project: Project, assignedWorkers: AssignedWorker[]) {
  if (assignedWorkers.length > 40) {
    throw new WorkforceStoreError("Una obra no puede tener más de 40 trabajadores asignados.", 400);
  }
  const currentProject = await getProject(project.id);
  const previousWorkers = currentProject?.assignedWorkers ?? [];
  const removedWorkers = previousWorkers.filter((worker) =>
    !assignedWorkers.some((current) => current.sub === worker.sub),
  );
  for (const worker of removedWorkers) {
    if (await getActiveShift(worker.sub) || await getActiveActivity(worker.sub)) {
      throw new WorkforceStoreError(`No se puede quitar a ${worker.email} mientras tenga un turno o actividad en curso.`, 409);
    }
  }
  for (const worker of assignedWorkers) {
    const assignments = await queryPartition(`USER#${worker.sub}`, "ASSIGNMENT");
    const otherProject = assignments.find((item) => Number(item.projectId) !== project.id);
    if (otherProject) {
      throw new WorkforceStoreError(`${worker.email} ya tiene otra obra asignada.`, 409);
    }
  }

  const { client, tableName } = getStore();
  if (assignedWorkers.length + removedWorkers.length + 1 > 100) {
    throw new WorkforceStoreError("La lista de trabajadores supera el límite de asignación de la obra.", 400);
  }
  const puts = [
    {
      Put: {
        TableName: tableName,
        Item: {
          PK: projectKey(project.id),
          SK: "METADATA",
          GSI1PK: "PROJECT",
          GSI1SK: `PROJECT#${project.id}`,
          entityType: "PROJECT",
          ...project,
          assignedWorkers,
          workforceUsed: Boolean(currentProject?.workforceUsed || previousWorkers.length || assignedWorkers.length),
        },
      },
    },
    ...assignedWorkers.map((worker) => ({
      Put: {
        TableName: tableName,
        Item: {
          PK: `USER#${worker.sub}`,
          SK: "ASSIGNMENT",
          entityType: "ASSIGNMENT",
          projectId: project.id,
          email: worker.email,
        },
        ConditionExpression: "attribute_not_exists(PK) OR projectId = :projectId",
        ExpressionAttributeValues: { ":projectId": project.id },
      },
    })),
    ...removedWorkers
      .map((worker) => ({
        Delete: {
          TableName: tableName,
          Key: { PK: `USER#${worker.sub}`, SK: "ASSIGNMENT" },
          ConditionExpression: "projectId = :projectId",
          ExpressionAttributeValues: { ":projectId": project.id },
        },
      })),
  ];
  await client.send(new TransactWriteCommand({ TransactItems: puts }));
}

export async function deleteEmptyProject(projectId: number) {
  const project = await getProject(projectId);
  if (!project) return;
  if (project.assignedWorkers.length) {
    throw new WorkforceStoreError("Primero quita los trabajadores asignados a esta obra.", 409);
  }
  if (project.workforceUsed) {
    throw new WorkforceStoreError("No se puede eliminar una obra que ya tuvo trabajadores asignados.", 409);
  }
  const relatedItems = await queryPartition(projectKey(projectId), "");
  if (relatedItems.some((item) => item.SK !== "METADATA")) {
    throw new WorkforceStoreError("No se puede eliminar una obra con actividades o maquinaria registradas.", 409);
  }
  const { client, tableName } = getStore();
  const shifts = await queryAll({
    IndexName: "GSI1",
    KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :prefix)",
    ExpressionAttributeValues: { ":pk": projectKey(projectId), ":prefix": "SHIFT#" },
  });
  if (shifts.length) {
    throw new WorkforceStoreError("No se puede eliminar una obra con turnos registrados.", 409);
  }
  await client.send(new DeleteCommand({
    TableName: tableName,
    Key: { PK: projectKey(projectId), SK: "METADATA" },
  }));
}

export async function listProjectMachines(projectId: number) {
  const items = await queryPartition(projectKey(projectId), "MACHINE#");
  return items.map((item) => ({
    id: String(item.id),
    projectId: Number(item.projectId),
    name: String(item.name),
    active: item.active === true,
  } satisfies ProjectMachine));
}

export async function saveProjectMachine(machine: ProjectMachine) {
  const { client, tableName } = getStore();
  await client.send(new PutCommand({
    TableName: tableName,
    Item: {
      PK: projectKey(machine.projectId),
      SK: `MACHINE#${machine.id}`,
      entityType: "MACHINE",
      ...machine,
    },
  }));
}

export async function listProjectTasks(projectId: number) {
  const items = await queryPartition(projectKey(projectId), "TASK#");
  return items.map((item) => item.task as ProjectTask);
}

export async function replaceProjectTasks(projectId: number, tasks: ProjectTask[]) {
  const { client, tableName } = getStore();
  const current = await queryPartition(projectKey(projectId), "TASK#");
  const taskIds = new Set(tasks.map((task) => String(task.id)));
  for (const task of tasks) {
    if (task.projectId !== projectId) {
      throw new WorkforceStoreError("Todas las actividades deben pertenecer a la obra indicada.", 400);
    }
    const storedTask: ProjectTask = {
      id: task.id,
      projectId: task.projectId,
      title: task.title,
      description: task.description,
      status: task.status,
      reviewStatus: task.reviewStatus,
      milestoneId: task.milestoneId,
      milestoneName: task.milestoneName,
      budgetedManHours: task.budgetedManHours,
      scheduledDate: task.scheduledDate,
      taskType: task.taskType,
    };
    await client.send(new PutCommand({
      TableName: tableName,
      Item: {
        PK: projectKey(projectId),
        SK: `TASK#${task.id}`,
        entityType: "TASK",
        task: storedTask,
      },
    }));
  }
  for (const item of current) {
    if (!taskIds.has(item.SK.slice("TASK#".length))) {
      await client.send(new DeleteCommand({
        TableName: tableName,
        Key: { PK: item.PK, SK: item.SK },
      }));
    }
  }
}

export async function getActiveShift(sub: string) {
  const { client, tableName } = getStore();
  const response = await client.send(new GetCommand({
    TableName: tableName,
    Key: { PK: `USER#${sub}`, SK: "SHIFT#ACTIVE" },
  }));
  return response.Item ? asShift(response.Item as StoreItem) : undefined;
}

export async function listWorkerShifts(sub: string) {
  const items = await queryPartition(`USER#${sub}`, "SHIFT#HISTORY#");
  return items.map(asShift)
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
}

export async function startShift(sub: string, email: string, name: string, projectId: number) {
  const project = (await listWorkerProjects(sub)).find((candidate) => candidate.id === projectId);
  if (!project) throw new WorkforceStoreError("No tienes esta obra asignada.", 403);
  const now = new Date().toISOString();
  const shift: ShiftRecord = {
    id: crypto.randomUUID(),
    projectId,
    workerEmail: email,
    workerName: name,
    startedAt: now,
    endedAt: "",
    durationSeconds: 0,
  };
  const { client, tableName } = getStore();
  try {
    await client.send(new TransactWriteCommand({
      TransactItems: [
        {
          ConditionCheck: {
            TableName: tableName,
            Key: { PK: `USER#${sub}`, SK: "ASSIGNMENT" },
            ConditionExpression: "projectId = :projectId",
            ExpressionAttributeValues: { ":projectId": projectId },
          },
        },
        {
          Put: {
            TableName: tableName,
            Item: {
              PK: `USER#${sub}`,
              SK: "SHIFT#ACTIVE",
              GSI1PK: projectKey(projectId),
              GSI1SK: `SHIFT#${shift.startedAt}#${sub}#${shift.id}`,
              entityType: "ACTIVE_SHIFT",
              ...shift,
            },
            ConditionExpression: "attribute_not_exists(PK)",
          },
        },
      ],
    }));
  } catch (error) {
    if (error instanceof Error && error.name === "TransactionCanceledException") {
      throw new WorkforceStoreError("Ya tienes un turno abierto o la obra ya no está asignada.", 409);
    }
    throw error;
  }
  return shift;
}

export async function endShift(sub: string) {
  const shift = await getActiveShift(sub);
  if (!shift) throw new WorkforceStoreError("No tienes un turno abierto.", 409);
  const endedAt = new Date().toISOString();
  const completed: ShiftRecord = {
    ...shift,
    endedAt,
    durationSeconds: Math.max(0, Math.floor((Date.parse(endedAt) - Date.parse(shift.startedAt)) / 1000)),
  };
  const { client, tableName } = getStore();
  await client.send(new TransactWriteCommand({
    TransactItems: [
      {
        Delete: {
          TableName: tableName,
          Key: { PK: `USER#${sub}`, SK: "SHIFT#ACTIVE" },
          ConditionExpression: "startedAt = :startedAt",
          ExpressionAttributeValues: { ":startedAt": shift.startedAt },
        },
      },
      {
        Put: {
          TableName: tableName,
          Item: {
            PK: `USER#${sub}`,
            SK: `SHIFT#HISTORY#${shift.startedAt}#${shift.id}`,
            GSI1PK: projectKey(shift.projectId),
            GSI1SK: `SHIFT#${shift.startedAt}#${sub}#${shift.id}`,
            entityType: "SHIFT",
            ...completed,
          },
        },
      },
    ],
  }));
  return completed;
}

export async function getActiveActivity(sub: string) {
  const { client, tableName } = getStore();
  const response = await client.send(new GetCommand({
    TableName: tableName,
    Key: { PK: `USER#${sub}`, SK: "ACTIVITY#ACTIVE" },
  }));
  return response.Item ? asActivity(response.Item as StoreItem) : undefined;
}

export async function listWorkerActivities(sub: string) {
  const items = await queryPartition(`USER#${sub}`, "ACTIVITY#HISTORY#");
  return items.map(asActivity)
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
}

export async function listProjectWorkerActivities(projectId: number) {
  const items = await queryAll({
    IndexName: "GSI1",
    KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :prefix)",
    ExpressionAttributeValues: {
      ":pk": projectKey(projectId),
      ":prefix": "ACTIVITY#",
    },
  });
  return items
    .map(asActivity)
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
}

export async function listProjectWorkerShifts(projectId: number) {
  const items = await queryAll({
    IndexName: "GSI1",
    KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :prefix)",
    ExpressionAttributeValues: {
      ":pk": projectKey(projectId),
      ":prefix": "SHIFT#",
    },
  });
  return items.map(asShift).sort((left, right) => right.startedAt.localeCompare(left.startedAt));
}

export async function startActivity(
  sub: string,
  email: string,
  name: string,
  projectId: number,
  taskId: number,
  machineId: string | null,
  comment: string,
) {
  const project = (await listWorkerProjects(sub)).find((candidate) => candidate.id === projectId);
  if (!project) throw new WorkforceStoreError("No tienes esta obra asignada.", 403);
  const [tasks, machines] = await Promise.all([
    listProjectTasks(projectId),
    listProjectMachines(projectId),
  ]);
  const task = tasks.find((candidate) => candidate.id === taskId);
  if (!task || task.status === "done") {
    throw new WorkforceStoreError("La actividad no está disponible en esta obra.", 404);
  }
  const machine = machineId ? machines.find((candidate) => candidate.id === machineId && candidate.active) : null;
  if (machineId && !machine) {
    throw new WorkforceStoreError("La maquinaria seleccionada no está disponible en esta obra.", 400);
  }
  const activity: WorkerActivity = {
    id: crypto.randomUUID(),
    projectId,
    taskId,
    taskTitle: task.title,
    workerEmail: email,
    workerName: name,
    machineId,
    machineName: machine?.name ?? null,
    comment,
    startedAt: new Date().toISOString(),
  };
  const { client, tableName } = getStore();
  try {
    await client.send(new TransactWriteCommand({
      TransactItems: [
        {
          ConditionCheck: {
            TableName: tableName,
            Key: { PK: `USER#${sub}`, SK: "ASSIGNMENT" },
            ConditionExpression: "projectId = :projectId",
            ExpressionAttributeValues: { ":projectId": projectId },
          },
        },
        {
          ConditionCheck: {
            TableName: tableName,
            Key: { PK: `USER#${sub}`, SK: "SHIFT#ACTIVE" },
            ConditionExpression: "projectId = :projectId",
            ExpressionAttributeValues: { ":projectId": projectId },
          },
        },
        {
          Put: {
            TableName: tableName,
            Item: {
              PK: `USER#${sub}`,
              SK: "ACTIVITY#ACTIVE",
              GSI1PK: projectKey(projectId),
              GSI1SK: `ACTIVITY#${activity.startedAt}#${sub}#${activity.id}`,
              entityType: "ACTIVE_ACTIVITY",
              ...activity,
            },
            ConditionExpression: "attribute_not_exists(PK)",
          },
        },
      ],
    }));
  } catch (error) {
    if (error instanceof Error && error.name === "TransactionCanceledException") {
      throw new WorkforceStoreError("Necesitas un turno activo y no puedes tener otra actividad en curso.", 409);
    }
    throw error;
  }
  return activity;
}

export async function endActivity(sub: string, comment: string) {
  const activity = await getActiveActivity(sub);
  if (!activity) throw new WorkforceStoreError("No tienes una actividad en curso.", 409);
  const endedAt = new Date().toISOString();
  const completed: WorkerActivity = {
    ...activity,
    comment: comment || activity.comment,
    endedAt,
    durationSeconds: Math.max(0, Math.floor((Date.parse(endedAt) - Date.parse(activity.startedAt)) / 1000)),
  };
  const { client, tableName } = getStore();
  await client.send(new TransactWriteCommand({
    TransactItems: [
      {
        Delete: {
          TableName: tableName,
          Key: { PK: `USER#${sub}`, SK: "ACTIVITY#ACTIVE" },
          ConditionExpression: "startedAt = :startedAt",
          ExpressionAttributeValues: { ":startedAt": activity.startedAt },
        },
      },
      {
        Put: {
          TableName: tableName,
          Item: {
            PK: `USER#${sub}`,
            SK: `ACTIVITY#HISTORY#${activity.startedAt}#${activity.id}`,
            GSI1PK: projectKey(activity.projectId),
            GSI1SK: `ACTIVITY#${activity.startedAt}#${sub}#${activity.id}`,
            entityType: "ACTIVITY",
            ...completed,
          },
        },
      },
    ],
  }));
  return completed;
}
