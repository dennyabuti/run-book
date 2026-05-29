import { describe, expect, it, vi } from "vitest";
import { generateReport } from "@/lib/reports/generator";
import { makeExecution, makePlan } from "@/test/fixtures";

describe("generateReport", () => {
  it("computes summary counts and completion percentage", () => {
    const plan = makePlan();
    const execution = makeExecution();

    const report = generateReport(plan, execution);

    expect(report.summary).toEqual({
      totalCases: 2,
      pass: 1,
      fail: 0,
      blocked: 0,
      skip: 0,
      untested: 1,
      completionPercent: 50,
    });
  });

  it("maps per-case title from plan and falls back to case id", () => {
    const plan = makePlan();
    const execution = makeExecution();
    execution.results.push({
      caseId: "missing_case",
      caseTitle: "will be overwritten",
      actualResult: "",
      status: "Skip",
      notes: "",
      stepStatuses: {},
    });

    const report = generateReport(plan, execution);

    expect(report.perCaseBreakdown[0].caseTitle).toBe("Successful checkout");
    expect(report.perCaseBreakdown[2].caseTitle).toBe("missing_case");
  });

  it("sets report identity and timestamps", () => {
    const plan = makePlan();
    const execution = makeExecution();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-03T00:00:00.000Z"));
    vi.spyOn(Math, "random").mockReturnValue(0.1);

    const report = generateReport(plan, execution);

    expect(report.id.startsWith("report_")).toBe(true);
    expect(report.planId).toBe(plan.id);
    expect(report.executionId).toBe(execution.id);
    expect(report.generatedAt).toBe("2026-01-03T00:00:00.000Z");
    vi.useRealTimers();
  });
});
