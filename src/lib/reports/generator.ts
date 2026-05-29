import { ExecutionSession, TestPlan, TestReport } from "@/types/domain";
import { percent, uid } from "@/lib/utils";

export function generateReport(plan: TestPlan, execution: ExecutionSession): TestReport {
  const totalCases = plan.testCases.length;
  const pass = execution.results.filter((r) => r.status === "Pass").length;
  const fail = execution.results.filter((r) => r.status === "Fail").length;
  const blocked = execution.results.filter((r) => r.status === "Blocked").length;
  const skip = execution.results.filter((r) => r.status === "Skip").length;
  const untested = execution.results.filter((r) => r.status === "Untested").length;
  const completionPercent = percent(totalCases - untested, totalCases);

  const caseTitleMap = new Map(plan.testCases.map((tc) => [tc.id, tc.title]));

  return {
    id: uid("report"),
    planId: plan.id,
    planTitle: plan.title,
    executionId: execution.id,
    testerName: execution.testerName,
    generatedAt: new Date().toISOString(),
    environment: plan.environment,
    summary: {
      totalCases,
      pass,
      fail,
      blocked,
      skip,
      untested,
      completionPercent,
    },
    perCaseBreakdown: execution.results.map((r) => ({
      ...r,
      caseTitle: caseTitleMap.get(r.caseId) ?? r.caseId,
    })),
    notes: "",
  };
}
