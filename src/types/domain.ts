export type PlanType = "New Feature" | "Bug Reproduction" | "Bug Resolution Verification";

export type TestCaseStatus = "Untested" | "Pass" | "Fail" | "Blocked" | "Skip";

export type Severity = "Critical" | "High" | "Medium" | "Low";

export interface TestStep {
  id: string;
  action: string;
  expectedOutcome: string;
  status: TestCaseStatus;
  notes: string;
}

export interface TestCase {
  id: string;
  title: string;
  description: string;
  preconditions: string;
  steps: TestStep[];
  expectedResult: string;
  actualResult: string;
  status: TestCaseStatus;
  severity: Severity;
  notes: string;
  attachments: string;
}

export interface EnvironmentConfig {
  browser: string;
  os: string;
  buildVersion: string;
  apiBaseUrl: string;
}

export interface JiraContext {
  source: "pasted" | "rest";
  ticketId: string;
  epicId: string;
  linkedTickets?: string[];
  summary: string;
  description: string;
  acceptanceCriteria: string;
}

export interface GitHubPrContext {
  prUrl: string;
  title: string;
  body: string;
  changedFiles: string[];
  commitMessages: string[];
}

export interface TestPlan {
  id: string;
  title: string;
  type: PlanType;
  description: string;
  environment: EnvironmentConfig;
  preconditions: string;
  testCases: TestCase[];
  jiraContext: JiraContext | null;
  githubPrContext: GitHubPrContext | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionCaseResult {
  caseId: string;
  caseTitle: string;
  actualResult: string;
  status: TestCaseStatus;
  notes: string;
  stepStatuses: Record<string, TestCaseStatus>;
}

export interface ExecutionSession {
  id: string;
  planId: string;
  testerName: string;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  results: ExecutionCaseResult[];
}

export interface ReportSummary {
  totalCases: number;
  pass: number;
  fail: number;
  blocked: number;
  skip: number;
  untested: number;
  completionPercent: number;
}

export interface TestReport {
  id: string;
  planId: string;
  planTitle: string;
  executionId: string;
  testerName: string;
  generatedAt: string;
  environment: EnvironmentConfig;
  summary: ReportSummary;
  perCaseBreakdown: ExecutionCaseResult[];
  notes: string;
}

export interface AppSettings {
  aiProvider: "gemini" | "anthropic" | "ollama" | "";
  aiModel: string;
  geminiApiKey: string;
  anthropicApiKey: string;
  ollamaBaseUrl: string;
  jiraBaseUrl: string;
  jiraEmail: string;
  jiraApiToken: string;
  githubToken: string;
  testerName: string;
}

export const defaultEnvironment: EnvironmentConfig = {
  browser: "",
  os: "",
  buildVersion: "",
  apiBaseUrl: "",
};

export const defaultSettings: AppSettings = {
  aiProvider: "",
  aiModel: "",
  geminiApiKey: "",
  anthropicApiKey: "",
  ollamaBaseUrl: "http://localhost:11434",
  jiraBaseUrl: "",
  jiraEmail: "",
  jiraApiToken: "",
  githubToken: "",
  testerName: "",
};
