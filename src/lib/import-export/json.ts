import { exportEnvelopeSchema, testPlanSchema, SCHEMA_VERSION } from "@/types/schema";
import { TestPlan } from "@/types/domain";

export function exportPlanAsJson(plan: TestPlan): string {
  return JSON.stringify(
    {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      kind: "plan",
      payload: plan,
    },
    null,
    2,
  );
}

export function importPlanFromJson(raw: string): TestPlan {
  const parsed = JSON.parse(raw);
  const envelope = exportEnvelopeSchema.parse(parsed);

  if (envelope.kind !== "plan") {
    throw new Error("The uploaded file is not a test plan export.");
  }

  return testPlanSchema.parse(envelope.payload);
}
