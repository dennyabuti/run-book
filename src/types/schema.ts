import { z } from "zod";

export const SCHEMA_VERSION = 1;

const testCaseStatusSchema = z.enum(["Untested", "Pass", "Fail", "Blocked", "Skip"]);
const severitySchema = z.enum(["Critical", "High", "Medium", "Low"]);

const testStepSchema = z.object({
  id: z.string().min(1),
  action: z.string(),
  expectedOutcome: z.string(),
  status: testCaseStatusSchema,
  notes: z.string(),
});

const testCaseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  preconditions: z.string(),
  steps: z.array(testStepSchema),
  expectedResult: z.string(),
  actualResult: z.string(),
  status: testCaseStatusSchema,
  severity: severitySchema,
  notes: z.string(),
  attachments: z.string(),
});

const environmentSchema = z.object({
  browser: z.string(),
  os: z.string(),
  buildVersion: z.string(),
  apiBaseUrl: z.string(),
});

const jiraSchema = z.object({
  source: z.enum(["pasted", "rest"]),
  ticketId: z.string(),
  epicId: z.string(),
  linkedTickets: z.array(z.string()).optional(),
  summary: z.string(),
  description: z.string(),
  acceptanceCriteria: z.string(),
});

const githubPrSchema = z.object({
  prUrl: z.string(),
  title: z.string(),
  body: z.string(),
  changedFiles: z.array(z.string()),
  commitMessages: z.array(z.string()),
});

export const testPlanSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(["New Feature", "Bug Reproduction", "Bug Resolution Verification"]),
  description: z.string(),
  environment: environmentSchema,
  preconditions: z.string(),
  testCases: z.array(testCaseSchema),
  jiraContext: jiraSchema.nullable(),
  githubPrContext: githubPrSchema.nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const exportEnvelopeSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  exportedAt: z.string(),
  kind: z.enum(["plan", "report"]),
  payload: z.unknown(),
});

export type ExportEnvelope = z.infer<typeof exportEnvelopeSchema>;
