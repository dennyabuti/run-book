import { beforeEach, describe, expect, it, vi } from "vitest";
import { deletePlan, getPlan, listPlans, savePlan } from "@/lib/repositories/plansRepo";
import type { TestPlan } from "@/types/domain";

const { getDb } = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ getDb }));

function makeDb(overrides: Record<string, unknown> = {}) {
  return {
    getAll: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  };
}

describe("plansRepo", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("listPlans returns latest updated first", async () => {
    const db = makeDb({
      getAll: vi.fn().mockResolvedValue([
        { id: "1", updatedAt: "2026-01-01T00:00:00.000Z" },
        { id: "2", updatedAt: "2026-01-02T00:00:00.000Z" },
      ]),
    });
    getDb.mockResolvedValue(db);

    const result = await listPlans();

    expect(result.map((p) => p.id)).toEqual(["2", "1"]);
    expect(db.getAll).toHaveBeenCalledWith("plans");
  });

  it("getPlan returns db row", async () => {
    const db = makeDb({ get: vi.fn().mockResolvedValue({ id: "abc" }) });
    getDb.mockResolvedValue(db);

    await expect(getPlan("abc")).resolves.toEqual({ id: "abc" });
    expect(db.get).toHaveBeenCalledWith("plans", "abc");
  });

  it("savePlan writes updatedAt timestamp", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10T00:00:00.000Z"));
    const db = makeDb();
    getDb.mockResolvedValue(db);
    const plan = { id: "p1", updatedAt: "old" } as TestPlan;

    await savePlan(plan);

    expect(db.put).toHaveBeenCalledWith(
      "plans",
      expect.objectContaining({ id: "p1", updatedAt: "2026-01-10T00:00:00.000Z" }),
    );
    vi.useRealTimers();
  });

  it("deletePlan deletes by id", async () => {
    const db = makeDb();
    getDb.mockResolvedValue(db);

    await deletePlan("p1");

    expect(db.delete).toHaveBeenCalledWith("plans", "p1");
  });
});
