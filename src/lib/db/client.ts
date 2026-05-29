import { DBSchema, IDBPDatabase, openDB } from "idb";
import { AppSettings, ExecutionSession, TestPlan, TestReport, defaultSettings } from "@/types/domain";

const DB_NAME = "runbook-db";
const DB_VERSION = 1;

interface RunBookDB extends DBSchema {
  plans: {
    key: string;
    value: TestPlan;
    indexes: { "by-updatedAt": string };
  };
  executions: {
    key: string;
    value: ExecutionSession;
    indexes: { "by-planId": string; "by-updatedAt": string };
  };
  reports: {
    key: string;
    value: TestReport;
    indexes: { "by-planId": string; "by-generatedAt": string };
  };
  settings: {
    key: string;
    value: AppSettings;
  };
  aiCache: {
    key: string;
    value: { key: string; value: string; createdAt: string };
  };
}

let dbPromise: Promise<IDBPDatabase<RunBookDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<RunBookDB>> {
  if (!dbPromise) {
    dbPromise = openDB<RunBookDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const plansStore = db.createObjectStore("plans", { keyPath: "id" });
        plansStore.createIndex("by-updatedAt", "updatedAt");

        const executionsStore = db.createObjectStore("executions", { keyPath: "id" });
        executionsStore.createIndex("by-planId", "planId");
        executionsStore.createIndex("by-updatedAt", "updatedAt");

        const reportsStore = db.createObjectStore("reports", { keyPath: "id" });
        reportsStore.createIndex("by-planId", "planId");
        reportsStore.createIndex("by-generatedAt", "generatedAt");

        db.createObjectStore("settings");
        db.createObjectStore("aiCache", { keyPath: "key" });
      },
    });
  }

  return dbPromise;
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDb();
  const settings = await db.get("settings", "app");

  if (!settings) {
    await db.put("settings", defaultSettings, "app");
    return defaultSettings;
  }

  return { ...defaultSettings, ...settings };
}

export async function setSettings(settings: AppSettings): Promise<void> {
  const db = await getDb();
  await db.put("settings", settings, "app");
}
