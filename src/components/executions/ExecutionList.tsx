"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listExecutions } from "@/lib/repositories/executionsRepo";
import { ExecutionSession } from "@/types/domain";

export function ExecutionList() {
  const [rows, setRows] = useState<ExecutionSession[]>([]);

  useEffect(() => {
    listExecutions().then(setRows);
  }, []);

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
          No test sessions yet. Create one from a plan after manual testing to log outcomes.
        </p>
      ) : null}

      {rows.map((row) => (
        <article key={row.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="font-semibold text-slate-900">Test session {row.id}</h3>
          <p className="text-sm text-slate-600">Plan: {row.planId}</p>
          <p className="text-sm text-slate-600">Tester: {row.testerName || "Unknown"}</p>
          <p className="text-xs text-slate-500">Updated: {new Date(row.updatedAt).toLocaleString()}</p>
          <Link href={`/executions/${row.id}`} className="mt-3 inline-block text-sm font-semibold text-indigo-700 hover:underline">
            View session
          </Link>
          <Link href={`/plans/${row.planId}`} className="mt-3 ml-4 inline-block text-sm font-semibold text-sky-700 hover:underline">
            Open plan
          </Link>
        </article>
      ))}
    </div>
  );
}
