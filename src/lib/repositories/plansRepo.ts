import { getDb } from "@/lib/db/client";
import { TestPlan } from "@/types/domain";

export async function listPlans(): Promise<TestPlan[]> {
  const db = await getDb();
  const plans = await db.getAll("plans");
  return plans.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getPlan(id: string): Promise<TestPlan | undefined> {
  const db = await getDb();
  return db.get("plans", id);
}

export async function savePlan(plan: TestPlan): Promise<void> {
  const db = await getDb();
  await db.put("plans", { ...plan, updatedAt: new Date().toISOString() });
}

export async function deletePlan(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("plans", id);
}
