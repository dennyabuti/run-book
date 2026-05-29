"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AiClient, AnthropicClient, GeminiClient, OllamaClient } from "@/lib/ai/adapters";
import { fetchJiraEpicContext, fetchJiraIssueContext } from "@/lib/ai/jira";
import { fetchGitHubPrContext } from "@/lib/ai/github";
import { exportPlanTestCasesToPdf } from "@/lib/import-export/pdf";
import { createCase, createPlan, createStep } from "@/lib/plans/factory";
import { getSettings, setSettings } from "@/lib/db/client";
import { getPlan, savePlan } from "@/lib/repositories/plansRepo";
import { getExecution, saveExecution } from "@/lib/repositories/executionsRepo";
import { saveReport } from "@/lib/repositories/reportsRepo";
import { generateReport } from "@/lib/reports/generator";
import { AppSettings, ExecutionSession, TestCaseStatus, TestPlan } from "@/types/domain";
import { uid } from "@/lib/utils";

const AI_STAGES = [
  "Analysing prompt…",
  "Generating test cases…",
  "Structuring acceptance criteria…",
  "Finalising output…",
];

const STATUS_BORDER: Record<string, string> = {
  Pass: "border-l-4 border-l-emerald-400",
  Fail: "border-l-4 border-l-red-400",
  Blocked: "border-l-4 border-l-amber-400",
  Skip: "border-l-4 border-l-sky-300",
  Untested: "border-l-4 border-l-slate-300",
};

const STATUS_BADGE: Record<string, string> = {
  Pass: "bg-emerald-100 text-emerald-700",
  Fail: "bg-red-100 text-red-700",
  Blocked: "bg-amber-100 text-amber-700",
  Skip: "bg-sky-100 text-sky-600",
  Untested: "bg-slate-100 text-slate-500",
};

const SEVERITY_BADGE: Record<string, string> = {
  Critical: "bg-red-100 text-red-700",
  High: "bg-orange-100 text-orange-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Low: "bg-blue-100 text-blue-700",
};

interface PlanEditorProps {
  planId?: string;
}

export function PlanEditor({ planId }: PlanEditorProps) {
  const [plan, setPlan] = useState<TestPlan>(createPlan());
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPlan, setIsLoadingPlan] = useState(!!planId);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiStageIndex, setAiStageIndex] = useState(0);
  const [jiraIssueId, setJiraIssueId] = useState("");
  const [jiraEpicId, setJiraEpicId] = useState("");
  const [githubPrUrl, setGithubPrUrl] = useState("");
  const [testerName, setTesterName] = useState("");
  const [activeExecutionId, setActiveExecutionId] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportFeedback, setExportFeedback] = useState("");
  const [collapsedCases, setCollapsedCases] = useState<Set<string>>(new Set());

  const stageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const generateRef = useRef<() => void>(() => undefined);
  const aiPromptRef = useRef(aiPrompt);

  useEffect(() => {
    aiPromptRef.current = aiPrompt;
  }, [aiPrompt]);

  const statusOptions: TestCaseStatus[] = ["Untested", "Pass", "Fail", "Blocked", "Skip"];

  const completion = useMemo(() => {
    const total = plan.testCases.length;
    const done = plan.testCases.filter((testCase) => testCase.status !== "Untested").length;
    return total === 0 ? 0 : Math.round((done / total) * 100);
  }, [plan.testCases]);

  // Load plan from IndexedDB
  useEffect(() => {
    if (!planId) return;
    setIsLoadingPlan(true);
    getPlan(planId).then((storedPlan) => {
      if (storedPlan) setPlan(storedPlan);
      setIsLoadingPlan(false);
    });
  }, [planId]);

  // Load tester name from settings on mount
  useEffect(() => {
    getSettings().then((settings) => {
      if (settings.testerName) setTesterName(settings.testerName);
    });
  }, []);

  // Debounce-save tester name to settings (500 ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      getSettings().then((settings) => {
        setSettings({ ...settings, testerName }).catch(() => undefined);
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [testerName]);

  // ⌘/Ctrl+Enter keyboard shortcut → generate test cases
  useEffect(() => {
    generateRef.current = () => {
      handleAiGenerate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        generateRef.current();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function persist(nextPlan: TestPlan) {
    setIsSaving(true);
    await savePlan(nextPlan);
    setIsSaving(false);
  }

  function updatePlan(nextPlan: TestPlan) {
    setPlan(nextPlan);
    persist(nextPlan).catch((err: unknown) => {
      setFeedback(err instanceof Error ? err.message : "Save failed.");
    });
  }

  function updateCase(caseIndex: number, patch: Partial<TestPlan["testCases"][number]>) {
    const nextCases = [...plan.testCases];
    nextCases[caseIndex] = { ...nextCases[caseIndex], ...patch };
    updatePlan({ ...plan, testCases: nextCases });
  }

  function updateStep(caseIndex: number, stepIndex: number, patch: Partial<TestPlan["testCases"][number]["steps"][number]>) {
    const nextCases = [...plan.testCases];
    const nextSteps = [...nextCases[caseIndex].steps];
    nextSteps[stepIndex] = { ...nextSteps[stepIndex], ...patch };
    nextCases[caseIndex] = { ...nextCases[caseIndex], steps: nextSteps };
    updatePlan({ ...plan, testCases: nextCases });
  }

  function deleteCase(caseIndex: number) {
    const nextCases = plan.testCases.filter((_, i) => i !== caseIndex);
    updatePlan({ ...plan, testCases: nextCases });
  }

  function deleteStep(caseIndex: number, stepIndex: number) {
    const nextCases = [...plan.testCases];
    nextCases[caseIndex] = {
      ...nextCases[caseIndex],
      steps: nextCases[caseIndex].steps.filter((_, i) => i !== stepIndex),
    };
    updatePlan({ ...plan, testCases: nextCases });
  }

  function moveCase(caseIndex: number, dir: -1 | 1) {
    const next = [...plan.testCases];
    const target = caseIndex + dir;
    if (target < 0 || target >= next.length) return;
    [next[caseIndex], next[target]] = [next[target], next[caseIndex]];
    updatePlan({ ...plan, testCases: next });
  }

  function bulkSetStatus(status: TestCaseStatus) {
    const nextCases = plan.testCases.map((c) => ({ ...c, status }));
    updatePlan({ ...plan, testCases: nextCases });
  }

  function toggleCollapse(caseId: string) {
    setCollapsedCases((prev) => {
      const next = new Set(prev);
      if (next.has(caseId)) next.delete(caseId);
      else next.add(caseId);
      return next;
    });
  }

  function buildExecutionSnapshot(executionId: string): ExecutionSession {
    return {
      id: executionId,
      planId: plan.id,
      testerName: testerName.trim() || "Unassigned tester",
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      results: plan.testCases.map((testCase) => ({
        caseId: testCase.id,
        caseTitle: testCase.title,
        actualResult: testCase.actualResult,
        status: testCase.status,
        notes: testCase.notes,
        stepStatuses: Object.fromEntries(testCase.steps.map((step) => [step.id, step.status])),
      })),
    };
  }

  function getClient(settings: AppSettings): AiClient {
    const { aiProvider: provider, aiModel: model, geminiApiKey: geminiKey, anthropicApiKey: anthropicKey, ollamaBaseUrl } = settings;

    if (provider === "gemini") {
      if (!geminiKey) {
        throw new Error("Gemini API key is required in settings.");
      }
      return new GeminiClient(geminiKey, model);
    }

    if (provider === "anthropic") {
      if (!anthropicKey) {
        throw new Error("Anthropic API key is required in settings.");
      }
      return new AnthropicClient(anthropicKey, model);
    }

    if (provider === "ollama") {
      return new OllamaClient(ollamaBaseUrl, model);
    }

    throw new Error("Unsupported AI provider selected.");
  }

  async function handleAiGenerate() {
    setFeedback("");
    setIsAiLoading(true);
    setAiStageIndex(0);
    stageTimerRef.current = setInterval(() => {
      setAiStageIndex((i) => (i + 1) % AI_STAGES.length);
    }, 1800);
    try {
      const settings = await getSettings();
      if (!settings.aiProvider) {
        throw new Error("Select an AI provider in settings first.");
      }

      const client = getClient(settings);

      const generatedCases = await client.generateTestCases({
        description: aiPromptRef.current || plan.description,
        planType: plan.type,
        jiraContext: plan.jiraContext ? JSON.stringify(plan.jiraContext) : "",
        githubContext: plan.githubPrContext ? JSON.stringify(plan.githubPrContext) : "",
      });

      const nextPlan = {
        ...plan,
        testCases: generatedCases.length > 0 ? generatedCases : plan.testCases,
      };
      updatePlan(nextPlan);
      setFeedback(`Generated ${generatedCases.length} test case(s).`);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "AI generation failed.");
    } finally {
      if (stageTimerRef.current) clearInterval(stageTimerRef.current);
      setIsAiLoading(false);
    }
  }

  async function handleFetchJira() {
    setFeedback("");
    try {
      const settings = await getSettings();
      const jira = await fetchJiraIssueContext(jiraIssueId, {
        baseUrl: settings.jiraBaseUrl,
        email: settings.jiraEmail,
        apiToken: settings.jiraApiToken,
      });

      const nextPlan = {
        ...plan,
        jiraContext: {
          source: "rest" as const,
          ticketId: jiraIssueId,
          epicId: "",
          linkedTickets: jira.linkedTicketKeys,
          summary: jira.summary,
          description: jira.description,
          acceptanceCriteria: jira.acceptanceCriteria,
        },
      };

      updatePlan(nextPlan);
      setFeedback("Jira context attached.");
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Jira fetch failed.");
    }
  }

  async function handleFetchJiraEpic() {
    setFeedback("");
    try {
      const settings = await getSettings();
      const epic = await fetchJiraEpicContext(jiraEpicId, {
        baseUrl: settings.jiraBaseUrl,
        email: settings.jiraEmail,
        apiToken: settings.jiraApiToken,
      });

      const nextPlan = {
        ...plan,
        jiraContext: {
          source: "rest" as const,
          ticketId: "",
          epicId: jiraEpicId,
          linkedTickets: epic.linkedTicketKeys,
          summary: epic.summary,
          description: epic.description,
          acceptanceCriteria: epic.acceptanceCriteria,
        },
      };

      updatePlan(nextPlan);
      setFeedback(`Jira epic context attached with ${epic.childIssueCount} ticket(s).`);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Jira epic fetch failed.");
    }
  }

  async function handleFetchGitHubPr() {
    setFeedback("");
    try {
      const settings = await getSettings();
      const pr = await fetchGitHubPrContext(githubPrUrl, {
        token: settings.githubToken || undefined,
      });

      updatePlan({ ...plan, githubPrContext: pr });
      setFeedback(
        `GitHub PR context attached — ${pr.changedFiles.length} file(s) changed, ${pr.commitMessages.length} commit(s).`,
      );
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "GitHub PR fetch failed.");
    }
  }

  async function handleCreateSession() {
    const executionId = uid("exec");
    await saveExecution(buildExecutionSnapshot(executionId));
    setActiveExecutionId(executionId);
    setFeedback("Test session created. Run the test outside RunBook, then record outcomes here.");
  }

  async function handleGenerateReport() {
    let execution: ExecutionSession | undefined;
    if (activeExecutionId) {
      execution = await getExecution(activeExecutionId);
      if (!execution) {
        setFeedback("Saved session was not found. Creating a fresh snapshot from current results.");
      }
    }

    if (!execution) {
      const executionId = uid("exec");
      execution = buildExecutionSnapshot(executionId);
      await saveExecution(execution);
      setActiveExecutionId(executionId);
    }

    const report = generateReport(plan, execution);
    await saveReport(report);
    setFeedback("Report generated and stored locally.");
  }

  async function handleExportTestCasesPdf() {
    setExportFeedback("");

    if (plan.testCases.length === 0) {
      setExportFeedback("Add at least one test case before exporting.");
      return;
    }

    try {
      setIsExportingPdf(true);
      const sanitizedTitle = (plan.title || "test-cases")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const filename = `${sanitizedTitle || "test-cases"}.pdf`;
      await exportPlanTestCasesToPdf(plan, filename);
      setExportFeedback(`Exported test cases to ${filename}.`);
    } catch (err) {
      setExportFeedback(err instanceof Error ? err.message : "Failed to export test cases PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Loading spinner while fetching plan */}
      {isLoadingPlan ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
          <span className="ml-3 text-sm text-slate-500">Loading plan…</span>
        </div>
      ) : null}

      {!isLoadingPlan ? (
        <>
          {/* Plan Metadata */}
          <section className="rounded-xl border border-slate-300 bg-slate-50 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-900">Plan Metadata</h2>
              <span className="text-sm text-slate-600">Execution completion: {completion}%</span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-sm text-slate-700">
                Title
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  value={plan.title}
                  onChange={(event) => updatePlan({ ...plan, title: event.target.value })}
                />
              </label>

              <label className="text-sm text-slate-700">
                Plan type
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  value={plan.type}
                  onChange={(event) => updatePlan({ ...plan, type: event.target.value as TestPlan["type"] })}
                >
                  <option>New Feature</option>
                  <option>Bug Reproduction</option>
                  <option>Bug Resolution Verification</option>
                </select>
              </label>

              <label className="text-sm text-slate-700 md:col-span-2">
                Description
                <textarea
                  className="mt-1 h-24 w-full rounded-md border border-slate-300 px-3 py-2"
                  value={plan.description}
                  onChange={(event) => updatePlan({ ...plan, description: event.target.value })}
                />
              </label>

              <label className="text-sm text-slate-700 md:col-span-2">
                Preconditions
                <textarea
                  className="mt-1 h-20 w-full rounded-md border border-slate-300 px-3 py-2"
                  value={plan.preconditions}
                  onChange={(event) => updatePlan({ ...plan, preconditions: event.target.value })}
                  placeholder="What must be true before testing starts?"
                />
              </label>

              <label className="text-sm text-slate-700">
                Browser
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  value={plan.environment.browser}
                  onChange={(event) =>
                    updatePlan({ ...plan, environment: { ...plan.environment, browser: event.target.value } })
                  }
                />
              </label>

              <label className="text-sm text-slate-700">
                OS
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  value={plan.environment.os}
                  onChange={(event) =>
                    updatePlan({ ...plan, environment: { ...plan.environment, os: event.target.value } })
                  }
                />
              </label>

              <label className="text-sm text-slate-700">
                Build version
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  value={plan.environment.buildVersion}
                  onChange={(event) =>
                    updatePlan({ ...plan, environment: { ...plan.environment, buildVersion: event.target.value } })
                  }
                />
              </label>

              <label className="text-sm text-slate-700">
                API base URL
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  value={plan.environment.apiBaseUrl}
                  onChange={(event) =>
                    updatePlan({ ...plan, environment: { ...plan.environment, apiBaseUrl: event.target.value } })
                  }
                />
              </label>
            </div>

            <div className="mt-4 text-xs text-slate-500">{isSaving ? "Saving…" : "All changes stored in IndexedDB."}</div>
          </section>

          {/* Result Logging */}
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Result Logging</h2>
            <p className="mt-2 text-sm text-slate-600">
              Run the manual test outside RunBook. After testing, return here to record case and step outcomes with notes.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Tester name (who recorded this session)"
                value={testerName}
                onChange={(event) => setTesterName(event.target.value)}
              />
              <button
                type="button"
                className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600"
                onClick={handleCreateSession}
              >
                Create test session
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                onClick={handleGenerateReport}
              >
                Generate report snapshot
              </button>
              <Link href="/reports" className="text-sm font-semibold text-sky-700 hover:underline">
                View reports
              </Link>
            </div>
          </section>

          {/* AI Assist and Jira Context */}
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">AI Assist and Jira Context</h2>

            {/* Jira context attached chip */}
            {plan.jiraContext ? (
              <div className="mt-3 flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 w-fit">
                <span>
                  Jira:{" "}
                  {plan.jiraContext.ticketId || plan.jiraContext.epicId}
                  {plan.jiraContext.summary ? ` — ${plan.jiraContext.summary.slice(0, 60)}${plan.jiraContext.summary.length > 60 ? "…" : ""}` : ""}
                </span>
                <button
                  type="button"
                  aria-label="Detach Jira context"
                  className="ml-1 rounded-full hover:text-red-600"
                  onClick={() => updatePlan({ ...plan, jiraContext: null })}
                >
                  ✕
                </button>
              </div>
            ) : null}

            {/* GitHub PR context attached chip */}
            {plan.githubPrContext ? (
              <div className="mt-3 flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 w-fit">
                <span>
                  PR:{" "}
                  {plan.githubPrContext.title
                    ? `${plan.githubPrContext.title.slice(0, 60)}${plan.githubPrContext.title.length > 60 ? "…" : ""}`
                    : plan.githubPrContext.prUrl}
                </span>
                <button
                  type="button"
                  aria-label="Detach GitHub PR context"
                  className="ml-1 rounded-full hover:text-red-600"
                  onClick={() => updatePlan({ ...plan, githubPrContext: null })}
                >
                  ✕
                </button>
              </div>
            ) : null}

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="text-sm text-slate-700 md:col-span-2">
                Feature or bug prompt
                <textarea
                  className="mt-1 h-20 w-full rounded-md border border-slate-300 px-3 py-2"
                  value={aiPrompt}
                  onChange={(event) => setAiPrompt(event.target.value)}
                  placeholder="Describe what should be tested — press ⌘Enter to generate"
                />
              </label>

              <div className="md:col-span-2 space-y-2">
                <button
                  type="button"
                  className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                  onClick={handleAiGenerate}
                  disabled={isAiLoading}
                >
                  {isAiLoading ? AI_STAGES[aiStageIndex] : "Generate test cases (⌘Enter)"}
                </button>
                {isAiLoading ? (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full animate-pulse rounded-full bg-emerald-500" style={{ width: "60%" }} />
                  </div>
                ) : null}
              </div>

              <div className="flex gap-2">
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Jira ticket ID (for REST)"
                  value={jiraIssueId}
                  onChange={(event) => setJiraIssueId(event.target.value)}
                />
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
                  onClick={handleFetchJira}
                >
                  Fetch ticket
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Jira epic ID (includes all epic tickets)"
                  value={jiraEpicId}
                  onChange={(event) => setJiraEpicId(event.target.value)}
                />
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
                  onClick={handleFetchJiraEpic}
                >
                  Fetch epic
                </button>
              </div>

              <div className="flex gap-2 md:col-span-2">
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="GitHub PR URL (e.g. https://github.com/owner/repo/pull/123)"
                  value={githubPrUrl}
                  onChange={(event) => setGithubPrUrl(event.target.value)}
                />
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
                  onClick={handleFetchGitHubPr}
                >
                  Fetch PR
                </button>
              </div>
            </div>
            {feedback ? <p className="mt-3 text-sm text-slate-700">{feedback}</p> : null}
          </section>

          {/* Test Cases */}
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h2 className="flex-1 text-xl font-semibold text-slate-900">
                Test Cases
                {plan.testCases.length > 0 ? (
                  <span className="ml-2 text-sm font-normal text-slate-500">({plan.testCases.length})</span>
                ) : null}
              </h2>

              {/* Bulk status */}
              {plan.testCases.length > 0 ? (
                <select
                  className="rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                  defaultValue=""
                  onChange={(event) => {
                    if (event.target.value) bulkSetStatus(event.target.value as TestCaseStatus);
                    event.target.value = "";
                  }}
                >
                  <option value="" disabled>Bulk set status…</option>
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : null}

              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
                onClick={() => updatePlan({ ...plan, testCases: [...plan.testCases, createCase()] })}
              >
                Add case
              </button>

              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-60"
                onClick={handleExportTestCasesPdf}
                disabled={isExportingPdf}
              >
                {isExportingPdf ? "Exporting PDF..." : "Export cases PDF"}
              </button>
            </div>

            {exportFeedback ? <p className="mb-3 text-sm text-slate-700">{exportFeedback}</p> : null}

            {/* Empty state */}
            {plan.testCases.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                <p className="font-medium text-slate-700">No test cases yet</p>
                <p className="mt-1">Click &ldquo;Add case&rdquo; or use AI Assist to generate cases from a prompt.</p>
              </div>
            ) : null}

            <div className="space-y-6">
              {plan.testCases.map((testCase, caseIndex) => {
                const isCollapsed = collapsedCases.has(testCase.id);
                const doneSteps = testCase.steps.filter((s) => s.status !== "Untested").length;
                return (
                  <article
                    key={testCase.id}
                    className={`overflow-hidden rounded-xl border border-slate-300 bg-white shadow-md ring-1 ring-slate-200/80 ${STATUS_BORDER[testCase.status] ?? "border-l-4 border-l-slate-300"}`}
                  >
                    {/* Card header */}
                    <div className="flex flex-wrap items-center gap-2 border-b border-slate-300 bg-gradient-to-r from-slate-100 to-white px-4 py-3">
                      <span className="rounded-md border border-slate-300 bg-slate-200 px-2 py-0.5 text-[11px] font-bold tracking-wide text-slate-700">
                        CASE {caseIndex + 1}
                      </span>
                      {/* Collapse toggle */}
                      <button
                        type="button"
                        aria-label={isCollapsed ? "Expand case" : "Collapse case"}
                        className="text-slate-400 hover:text-slate-700"
                        onClick={() => toggleCollapse(testCase.id)}
                      >
                        {isCollapsed ? "▶" : "▼"}
                      </button>

                      <span className="flex-1 break-words text-sm font-semibold text-slate-900">
                        {testCase.title ? testCase.title : <span className="italic text-slate-400">Untitled case</span>}
                      </span>

                      {/* Step completion indicator */}
                      {testCase.steps.length > 0 ? (
                        <span className="rounded-md bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {doneSteps}/{testCase.steps.length} steps
                        </span>
                      ) : null}

                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${SEVERITY_BADGE[testCase.severity] ?? ""}`}>
                        {testCase.severity}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[testCase.status] ?? ""}`}>
                        {testCase.status}
                      </span>

                      {/* Reorder buttons */}
                      <button
                        type="button"
                        aria-label="Move case up"
                        disabled={caseIndex === 0}
                        className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        onClick={() => moveCase(caseIndex, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label="Move case down"
                        disabled={caseIndex === plan.testCases.length - 1}
                        className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        onClick={() => moveCase(caseIndex, 1)}
                      >
                        ↓
                      </button>

                      {/* Delete case */}
                      <button
                        type="button"
                        aria-label="Delete case"
                        className="text-xs text-rose-400 hover:text-rose-600"
                        onClick={() => deleteCase(caseIndex)}
                      >
                        ✕
                      </button>
                    </div>

                    {!isCollapsed ? (
                      <>
                        {/* Plan authoring — white background */}
                        <div className="grid gap-3 bg-white p-4 md:grid-cols-2">
                          <label className="text-sm font-medium text-slate-700">
                            Case title
                            <textarea
                              className="mt-1 h-16 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm"
                              value={testCase.title}
                              onChange={(event) => updateCase(caseIndex, { title: event.target.value })}
                            />
                          </label>

                          <label className="text-sm font-medium text-slate-700">
                            Severity
                            <select
                              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                              value={testCase.severity}
                              onChange={(event) =>
                                updateCase(caseIndex, { severity: event.target.value as TestPlan["testCases"][number]["severity"] })
                              }
                            >
                              <option>Critical</option>
                              <option>High</option>
                              <option>Medium</option>
                              <option>Low</option>
                            </select>
                          </label>

                          <label className="text-sm font-medium text-slate-700 md:col-span-2">
                            Expected result
                            <textarea
                              className="mt-1 h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                              value={testCase.expectedResult}
                              onChange={(event) => updateCase(caseIndex, { expectedResult: event.target.value })}
                            />
                          </label>

                          <label className="text-sm font-medium text-slate-700 md:col-span-2">
                            Case guidance / preconditions
                            <textarea
                              className="mt-1 h-16 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                              value={testCase.preconditions}
                              onChange={(event) => updateCase(caseIndex, { preconditions: event.target.value })}
                            />
                          </label>

                          <label className="text-sm font-medium text-slate-700 md:col-span-2">
                            Case context / description
                            <textarea
                              className="mt-1 h-16 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                              value={testCase.description}
                              onChange={(event) => updateCase(caseIndex, { description: event.target.value })}
                            />
                          </label>
                        </div>

                        {/* Outcome recording */}
                        <div className="border-t border-slate-200 bg-amber-50/70 p-4">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-700">Outcome</p>
                          <div className="grid gap-3 md:grid-cols-2">
                            <label className="text-sm font-medium text-slate-700">
                              Status after testing
                              <select
                                className="mt-1 w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm"
                                value={testCase.status}
                                onChange={(event) =>
                                  updateCase(caseIndex, { status: event.target.value as TestCaseStatus })
                                }
                              >
                                {statusOptions.map((status) => (
                                  <option key={status} value={status}>{status}</option>
                                ))}
                              </select>
                            </label>

                            <label className="text-sm font-medium text-slate-700">
                              Actual result
                              <textarea
                                className="mt-1 h-20 w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm"
                                value={testCase.actualResult}
                                onChange={(event) => updateCase(caseIndex, { actualResult: event.target.value })}
                              />
                            </label>

                            <label className="text-sm font-medium text-slate-700 md:col-span-2">
                              Tester notes
                              <textarea
                                className="mt-1 h-16 w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm"
                                value={testCase.notes}
                                onChange={(event) => updateCase(caseIndex, { notes: event.target.value })}
                              />
                            </label>
                          </div>
                        </div>

                        {/* Steps */}
                        <div className="border-t border-indigo-200 bg-indigo-50/60 p-4">
                          <p className="mb-3 rounded-md bg-indigo-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700">
                            Steps
                          </p>
                          <div className="space-y-3">
                            {testCase.steps.map((step, stepIndex) => (
                              <div
                                key={step.id}
                                className={`overflow-hidden rounded-lg border border-indigo-200 bg-white shadow-sm ${STATUS_BORDER[step.status] ?? "border-l-4 border-l-slate-200"}`}
                              >
                                {/* Step header */}
                                <div className="flex items-center gap-2 border-b border-indigo-100 bg-indigo-50 px-3 py-2">
                                  <span className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-indigo-700">Step {stepIndex + 1}</span>
                                  <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[step.status] ?? ""}`}>
                                    {step.status}
                                  </span>
                                  <button
                                    type="button"
                                    aria-label="Delete step"
                                    className="text-xs text-rose-400 hover:text-rose-600"
                                    onClick={() => deleteStep(caseIndex, stepIndex)}
                                  >
                                    ✕
                                  </button>
                                </div>

                                {/* Step authoring */}
                                <div className="grid gap-3 bg-white p-3 md:grid-cols-2">
                                  <label className="text-sm font-medium text-slate-700">
                                    Action
                                    <textarea
                                      className="mt-1 h-20 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm"
                                      value={step.action}
                                      onChange={(event) => updateStep(caseIndex, stepIndex, { action: event.target.value })}
                                    />
                                  </label>

                                  <label className="text-sm font-medium text-slate-700">
                                    Expected outcome
                                    <textarea
                                      className="mt-1 h-20 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm"
                                      value={step.expectedOutcome}
                                      onChange={(event) => updateStep(caseIndex, stepIndex, { expectedOutcome: event.target.value })}
                                    />
                                  </label>
                                </div>

                                {/* Step outcome */}
                                <div className="grid gap-3 border-t border-indigo-100 bg-slate-50 p-3 md:grid-cols-2">
                                  <label className="text-sm font-medium text-slate-700">
                                    Step status
                                    <select
                                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                                      value={step.status}
                                      onChange={(event) =>
                                        updateStep(caseIndex, stepIndex, { status: event.target.value as TestCaseStatus })
                                      }
                                    >
                                      {statusOptions.map((status) => (
                                        <option key={status} value={status}>{status}</option>
                                      ))}
                                    </select>
                                  </label>

                                  <label className="text-sm font-medium text-slate-700">
                                    Notes
                                    <textarea
                                      className="mt-1 h-16 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                                      value={step.notes}
                                      onChange={(event) => updateStep(caseIndex, stepIndex, { notes: event.target.value })}
                                    />
                                  </label>
                                </div>
                              </div>
                            ))}

                            <button
                              type="button"
                              className="rounded-md border border-slate-300 px-3 py-2 text-xs hover:bg-slate-100"
                              onClick={() => {
                                const nextCases = [...plan.testCases];
                                nextCases[caseIndex] = { ...testCase, steps: [...testCase.steps, createStep()] };
                                updatePlan({ ...plan, testCases: nextCases });
                              }}
                            >
                              Add step
                            </button>
                          </div>
                        </div>
                      </>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
