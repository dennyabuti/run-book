"use client";

import { useEffect, useState } from "react";
import { getExecution } from "@/lib/repositories/executionsRepo";
import { ExecutionSession, TestCaseStatus } from "@/types/domain";

const STATUS_BADGE: Record<TestCaseStatus, string> = {
  Pass: "bg-emerald-100 text-emerald-700",
  Fail: "bg-red-100 text-red-700",
  Blocked: "bg-amber-100 text-amber-700",
  Skip: "bg-sky-100 text-sky-600",
  Untested: "bg-slate-100 text-slate-500",
};

interface ExecutionDetailProps {
  executionId: string;
}

export function ExecutionDetail({ executionId }: ExecutionDetailProps) {
  const [session, setSession] = useState<ExecutionSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getExecution(executionId).then((data) => {
      setSession(data ?? null);
      setLoading(false);
    });
  }, [executionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
        <span className="ml-3 text-sm text-slate-500">Loading session…</span>
      </div>
    );
  }

  if (!session) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
        Test session not found.
      </p>
    );
  }

  const pass = session.results.filter((r) => r.status === "Pass").length;
  const fail = session.results.filter((r) => r.status === "Fail").length;
  const blocked = session.results.filter((r) => r.status === "Blocked").length;
  const skip = session.results.filter((r) => r.status === "Skip").length;
  const untested = session.results.filter((r) => r.status === "Untested").length;

  return (
    <div className="space-y-6">
      {/* Session header */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">
              Tester: <strong className="text-slate-900">{session.testerName || "Unassigned"}</strong>
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Started: {new Date(session.startedAt).toLocaleString()}
            </p>
            <p className="text-xs text-slate-400">
              Updated: {new Date(session.updatedAt).toLocaleString()}
            </p>
            {session.completedAt ? (
              <p className="text-xs text-slate-400">
                Completed: {new Date(session.completedAt).toLocaleString()}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">✓ Pass {pass}</span>
            <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">✗ Fail {fail}</span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">⊘ Blocked {blocked}</span>
            <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-600">↷ Skip {skip}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-500">○ Untested {untested}</span>
          </div>
        </div>
      </section>

      {/* Per-case table */}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
          <h2 className="font-semibold text-slate-900">Case Results</h2>
        </div>
        {session.results.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No case results recorded.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs text-slate-500">
                <th className="px-5 py-2.5 font-semibold">Case</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold">Actual result / Notes</th>
              </tr>
            </thead>
            <tbody>
              {session.results.map((result) => (
                <tr key={result.caseId} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-5 py-2.5 font-medium text-slate-800">
                    {result.caseTitle || result.caseId}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[result.status]}`}>
                      {result.status}
                    </span>
                  </td>
                  <td className="max-w-xs px-3 py-2.5 text-xs text-slate-500">
                    {result.actualResult || result.notes || <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
