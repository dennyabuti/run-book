import { getDb } from "@/lib/db/client";
import { TestReport } from "@/types/domain";

export async function listReports(): Promise<TestReport[]> {
  const db = await getDb();
  const rows = await db.getAll("reports");
  return rows.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
}

export async function getReport(id: string): Promise<TestReport | undefined> {
  const db = await getDb();
  return db.get("reports", id);
}

export async function saveReport(report: TestReport): Promise<void> {
  const db = await getDb();
  await db.put("reports", report);
}
