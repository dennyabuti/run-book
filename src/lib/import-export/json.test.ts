import { describe, expect, it } from "vitest";
import { exportPlanAsJson, importPlanFromJson } from "@/lib/import-export/json";
import { SCHEMA_VERSION } from "@/types/schema";
import { makePlan } from "@/test/fixtures";

describe("plan JSON import-export", () => {
  it("exports expected envelope shape", () => {
    const plan = makePlan();
    const text = exportPlanAsJson(plan);
    const parsed = JSON.parse(text) as {
      schemaVersion: number;
      exportedAt: string;
      kind: string;
      payload: { id: string };
    };

    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION);
    expect(parsed.kind).toBe("plan");
    expect(typeof parsed.exportedAt).toBe("string");
    expect(parsed.payload.id).toBe("plan_1");
  });

  it("imports a valid exported plan", () => {
    const plan = makePlan();
    const raw = exportPlanAsJson(plan);

    const imported = importPlanFromJson(raw);

    expect(imported).toEqual(plan);
  });

  it("throws when kind is not plan", () => {
    const payload = {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      kind: "report",
      payload: makePlan(),
    };

    expect(() => importPlanFromJson(JSON.stringify(payload))).toThrow(
      "The uploaded file is not a test plan export.",
    );
  });

  it("throws when schemaVersion is invalid", () => {
    const payload = {
      schemaVersion: 999,
      exportedAt: new Date().toISOString(),
      kind: "plan",
      payload: makePlan(),
    };

    expect(() => importPlanFromJson(JSON.stringify(payload))).toThrow();
  });

  it("throws when plan payload is invalid", () => {
    const payload = {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      kind: "plan",
      payload: { id: "x", title: "", type: "New Feature" },
    };

    expect(() => importPlanFromJson(JSON.stringify(payload))).toThrow();
  });
});
