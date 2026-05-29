import { TestCase, TestPlan, TestStep, defaultEnvironment } from "@/types/domain";
import { uid } from "@/lib/utils";

export function createStep(): TestStep {
  return {
    id: uid("step"),
    action: "",
    expectedOutcome: "",
    status: "Untested",
    notes: "",
  };
}

export function createCase(): TestCase {
  return {
    id: uid("case"),
    title: "",
    description: "",
    preconditions: "",
    steps: [createStep()],
    expectedResult: "",
    actualResult: "",
    status: "Untested",
    severity: "Medium",
    notes: "",
    attachments: "",
  };
}

export function createPlan(): TestPlan {
  return {
    id: uid("plan"),
    title: "",
    type: "New Feature",
    description: "",
    environment: { ...defaultEnvironment },
    preconditions: "",
    testCases: [createCase()],
    jiraContext: null,
    githubPrContext: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
