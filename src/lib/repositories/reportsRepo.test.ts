import { beforeEach, describe, expect, it, vi } from "vitest";
import { getReport, listReports, saveReport } from "@/lib/repositories/reportsRepo";
import type { TestReport } from "@/types/domain";

const { getDb } = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ getDb }));

function makeDb(overrides: Record<string, unknown> = {}) {
  return {
    getAll: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    ...overrides,
  };
}

describe("reportsRepo", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("listReports returns latest generated first", async () => {
    const db = makeDb({
      getAll: vi.fn().mockResolvedValue([
        { id: "1", generatedAt: "2026-01-01T00:00:00.000Z" },
        { id: "2", generatedAt: "2026-01-02T00:00:00.000Z" },
      ]),
    });
    getDb.mockResolvedValue(db);

    const result = await listReports();

    expect(result.map((r) => r.id)).toEqual(["2", "1"]);
  });

  it("getReport returns single row", async () => {
    const db = makeDb({ get: vi.fn().mockResolvedValue({ id: "r1" }) });
    getDb.mockResolvedValue(db);

    await expect(getReport("r1")).resolves.toEqual({ id: "r1" });
    expect(db.get).toHaveBeenCalledWith("reports", "r1");
  });

  it("saveReport puts report unchanged", async () => {
    const db = makeDb();
    getDb.mockResolvedValue(db);
    const report = { id: "r1" } as TestReport;

    await saveReport(report);

    expect(db.put).toHaveBeenCalledWith("reports", report);
  });
});
