import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getExecution,
  listExecutions,
  listExecutionsByPlan,
  saveExecution,
} from "@/lib/repositories/executionsRepo";
import type { ExecutionSession } from "@/types/domain";

const { getDb } = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ getDb }));

function makeDb(overrides: Record<string, unknown> = {}) {
  return {
    getAll: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    transaction: vi.fn(),
    ...overrides,
  };
}

describe("executionsRepo", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("listExecutionsByPlan uses by-planId index and sorts desc by updatedAt", async () => {
    const index = {
      getAll: vi.fn().mockResolvedValue([
        { id: "1", updatedAt: "2026-01-01T00:00:00.000Z" },
        { id: "2", updatedAt: "2026-01-02T00:00:00.000Z" },
      ]),
    };
    const db = makeDb({
      transaction: vi.fn().mockReturnValue({
        store: {
          index: vi.fn().mockReturnValue(index),
        },
      }),
    });
    getDb.mockResolvedValue(db);

    const result = await listExecutionsByPlan("plan_1");

    expect(result.map((r) => r.id)).toEqual(["2", "1"]);
    expect(index.getAll).toHaveBeenCalledWith("plan_1");
  });

  it("getExecution returns row by id", async () => {
    const db = makeDb({ get: vi.fn().mockResolvedValue({ id: "e1" }) });
    getDb.mockResolvedValue(db);

    await expect(getExecution("e1")).resolves.toEqual({ id: "e1" });
    expect(db.get).toHaveBeenCalledWith("executions", "e1");
  });

  it("saveExecution rewrites updatedAt", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10T00:00:00.000Z"));
    const db = makeDb();
    getDb.mockResolvedValue(db);

    await saveExecution({ id: "e1", updatedAt: "old" } as ExecutionSession);

    expect(db.put).toHaveBeenCalledWith(
      "executions",
      expect.objectContaining({ id: "e1", updatedAt: "2026-01-10T00:00:00.000Z" }),
    );
    vi.useRealTimers();
  });

  it("listExecutions returns all rows sorted desc", async () => {
    const db = makeDb({
      getAll: vi.fn().mockResolvedValue([
        { id: "1", updatedAt: "2026-01-01T00:00:00.000Z" },
        { id: "2", updatedAt: "2026-01-02T00:00:00.000Z" },
      ]),
    });
    getDb.mockResolvedValue(db);

    const result = await listExecutions();

    expect(result.map((r) => r.id)).toEqual(["2", "1"]);
    expect(db.getAll).toHaveBeenCalledWith("executions");
  });
});
