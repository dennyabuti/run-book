import type { ExecutionSession, TestPlan } from "@/types/domain";

export function makePlan(): TestPlan {
  return {
    id: "plan_1",
    title: "Checkout Plan",
    type: "New Feature",
    description: "Plan description",
    environment: {
      browser: "Chrome",
      os: "macOS",
      buildVersion: "1.2.3",
      apiBaseUrl: "https://api.example.com",
    },
    preconditions: "User has an account",
    testCases: [
      {
        id: "case_1",
        title: "Successful checkout",
        description: "desc",
        preconditions: "Logged in",
        steps: [
          {
            id: "step_1",
            action: "Add item to cart",
            expectedOutcome: "Item appears in cart",
            status: "Untested",
            notes: "",
          },
        ],
        expectedResult: "Order placed",
        actualResult: "",
        status: "Pass",
        severity: "High",
        notes: "",
        attachments: "",
      },
      {
        id: "case_2",
        title: "Card declined",
        description: "desc",
        preconditions: "Logged in",
        steps: [
          {
            id: "step_2",
            action: "Use invalid card",
            expectedOutcome: "Error shown",
            status: "Untested",
            notes: "",
          },
        ],
        expectedResult: "Payment blocked",
        actualResult: "",
        status: "Untested",
        severity: "Medium",
        notes: "",
        attachments: "",
      },
    ],
    jiraContext: null,
    githubPrContext: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

export function makeExecution(): ExecutionSession {
  return {
    id: "exec_1",
    planId: "plan_1",
    testerName: "Dennis",
    startedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    completedAt: null,
    results: [
      {
        caseId: "case_1",
        caseTitle: "placeholder",
        actualResult: "Order placed",
        status: "Pass",
        notes: "",
        stepStatuses: { step_1: "Pass" },
      },
      {
        caseId: "case_2",
        caseTitle: "placeholder",
        actualResult: "",
        status: "Untested",
        notes: "",
        stepStatuses: { step_2: "Untested" },
      },
    ],
  };
}
