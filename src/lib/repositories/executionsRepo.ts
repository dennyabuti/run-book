import { getDb } from "@/lib/db/client";
import { ExecutionSession } from "@/types/domain";

export async function listExecutionsByPlan(planId: string): Promise<ExecutionSession[]> {
  const db = await getDb();
  const index = db.transaction("executions", "readonly").store.index("by-planId");
  const rows = await index.getAll(planId);
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getExecution(id: string): Promise<ExecutionSession | undefined> {
  const db = await getDb();
  return db.get("executions", id);
}

export async function saveExecution(execution: ExecutionSession): Promise<void> {
  const db = await getDb();
  await db.put("executions", {
    ...execution,
    updatedAt: new Date().toISOString(),
  });
}

export async function listExecutions(): Promise<ExecutionSession[]> {
  const db = await getDb();
  const rows = await db.getAll("executions");
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
