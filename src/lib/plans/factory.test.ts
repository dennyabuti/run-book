import { describe, expect, it, vi } from "vitest";
import { createCase, createPlan, createStep } from "@/lib/plans/factory";
import { defaultEnvironment } from "@/types/domain";

describe("plan factory", () => {
  it("createStep creates default untested step", () => {
    const step = createStep();
    expect(step.status).toBe("Untested");
    expect(step.action).toBe("");
    expect(step.expectedOutcome).toBe("");
    expect(step.notes).toBe("");
    expect(step.id.startsWith("step_")).toBe(true);
  });

  it("createCase creates case with one default step", () => {
    const c = createCase();
    expect(c.status).toBe("Untested");
    expect(c.severity).toBe("Medium");
    expect(c.steps).toHaveLength(1);
    expect(c.steps[0].status).toBe("Untested");
    expect(c.id.startsWith("case_")).toBe(true);
  });

  it("createPlan creates plan with one default case and cloned environment", () => {
    const plan = createPlan();
    expect(plan.type).toBe("New Feature");
    expect(plan.testCases).toHaveLength(1);
    expect(plan.environment).toEqual({
      browser: "",
      os: "",
      buildVersion: "",
      apiBaseUrl: "",
    });
    expect(plan.environment).not.toBe(defaultEnvironment);
  });

  it("createPlan sets createdAt and updatedAt using current date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-02T03:04:05.000Z"));

    const plan = createPlan();

    expect(plan.createdAt).toBe("2026-01-02T03:04:05.000Z");
    expect(plan.updatedAt).toBe("2026-01-02T03:04:05.000Z");
    vi.useRealTimers();
  });
});
