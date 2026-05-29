"use client";

import { useEffect, useRef, useState } from "react";
import { listReports } from "@/lib/repositories/reportsRepo";
import { exportElementToPng } from "@/lib/import-export/image";
import { TestCaseStatus, TestReport } from "@/types/domain";

const STATUS_BADGE: Record<TestCaseStatus, string> = {
  Pass: "bg-emerald-100 text-emerald-700",
  Fail: "bg-red-100 text-red-700",
  Blocked: "bg-amber-100 text-amber-700",
  Skip: "bg-sky-100 text-sky-600",
  Untested: "bg-slate-100 text-slate-500",
};

export function ReportsList() {
  const [reports, setReports] = useState<TestReport[]>([]);
  const [exporting, setExporting] = useState<string | null>(null);
  const articleRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    listReports().then(setReports);
  }, []);

  async function handleExportScreenshot(report: TestReport) {
    const el = articleRefs.current.get(report.id);
    if (!el) return;
    setExporting(report.id);
    try {
      await exportElementToPng(el, `report-${report.id}.png`);
    } finally {
      setExporting(null);
    }
  }

  if (reports.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
        No reports generated yet. Open a plan and click &ldquo;Generate report snapshot&rdquo;.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {reports.map((report) => {
        const { summary: s } = report;
        const envParts = [report.environment.browser, report.environment.os, report.environment.buildVersion].filter(Boolean);

        return (
        <article key={report.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" ref={(el) => {
          if (el) articleRefs.current.set(report.id, el);
          else articleRefs.current.delete(report.id);
        }}>
            {/* Header */}
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-900">{report.planTitle || report.planId}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Tester: <strong className="text-slate-700">{report.testerName}</strong>
                    {envParts.length > 0 ? (
                      <>
                        {" "}·{" "}
                        <span>{envParts.join(" · ")}</span>
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <time className="shrink-0 text-xs text-slate-400">{new Date(report.generatedAt).toLocaleString()}</time>
                  <button
                    type="button"
                    disabled={exporting === report.id}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    onClick={() => handleExportScreenshot(report)}
                  >
                    {exporting === report.id ? "Exporting…" : "Export Screenshot"}
                  </button>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="px-5 py-4">
              <div className="mb-3 flex items-center gap-3">
                <span className="text-xs font-medium text-slate-500">Completion</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${s.completionPercent}%` }}
                  />
                </div>
                <span className="w-9 text-right text-xs font-semibold text-slate-700">{s.completionPercent}%</span>
              </div>

              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">✓ Pass {s.pass}</span>
                <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">✗ Fail {s.fail}</span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">⊘ Blocked {s.blocked}</span>
                <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-600">↷ Skip {s.skip}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-500">○ Untested {s.untested}</span>
                <span className="ml-auto text-slate-400">{s.totalCases} case{s.totalCases !== 1 ? "s" : ""} total</span>
              </div>
            </div>

            {/* Per-case breakdown */}
            {report.perCaseBreakdown.length > 0 ? (
              <div className="border-t border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs text-slate-500">
                      <th className="px-5 py-2 font-semibold">Case</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Actual result / Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.perCaseBreakdown.map((row) => (
                      <tr key={row.caseId} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-5 py-2.5 font-medium text-slate-800">{row.caseTitle || row.caseId}</td>
                        <td className="px-3 py-2.5">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[row.status]}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="max-w-xs px-3 py-2.5 text-xs text-slate-500">
                          {row.actualResult || row.notes || <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
