"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import { deletePlan, listPlans, savePlan } from "@/lib/repositories/plansRepo";
import { downloadTextFile } from "@/lib/import-export/download";
import { exportPlanAsJson, importPlanFromJson } from "@/lib/import-export/json";
import { uid } from "@/lib/utils";
import { TestPlan } from "@/types/domain";

export function PlansDashboard() {
  const [plans, setPlans] = useState<TestPlan[]>([]);
  const [error, setError] = useState("");

  async function loadPlans() {
    return listPlans();
  }

  async function refreshPlans() {
    const rows = await loadPlans();
    setPlans(rows);
  }

  useEffect(() => {
    loadPlans()
      .then((rows) => {
        setPlans(rows);
      })
      .catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to load plans.");
      });
  }, []);

  async function handleDuplicate(plan: TestPlan) {
    const duplicated: TestPlan = {
      ...plan,
      id: uid("plan"),
      title: `${plan.title} (copy)`,
      testCases: plan.testCases.map((c) => ({
        ...c,
        id: uid("case"),
        status: "Untested" as const,
        actualResult: "",
        notes: "",
        steps: c.steps.map((s) => ({ ...s, id: uid("step"), status: "Untested" as const, notes: "" })),
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await savePlan(duplicated);
    await refreshPlans();
  }

  async function handleDelete(id: string) {
    await deletePlan(id);
    await refreshPlans();
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const raw = await file.text();
    const plan = importPlanFromJson(raw);
    await savePlan({
      ...plan,
      id: `${plan.id}_imported_${Date.now()}`,
      updatedAt: new Date().toISOString(),
    });
    await refreshPlans();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/plans/new"
          className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
        >
          New Test Plan
        </Link>
        <label className="cursor-pointer rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
          Import JSON
          <input className="hidden" type="file" accept="application/json" onChange={handleImport} />
        </label>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-4">
        {plans.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            No plans yet. Create one from scratch or import a teammate export.
          </div>
        ) : null}

        {plans.map((plan) => {
          const totalCases = plan.testCases.length;
          const doneCases = plan.testCases.filter((c) => c.status !== "Untested").length;
          const completionPct = totalCases === 0 ? 0 : Math.round((doneCases / totalCases) * 100);

          return (
          <article key={plan.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900">{plan.title || "Untitled plan"}</h3>
                <p className="mt-1 text-sm text-slate-600">{plan.type}</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-xs text-slate-500">{totalCases} case{totalCases !== 1 ? "s" : ""}</span>
                  {totalCases > 0 ? (
                    <>
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${completionPct}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-600">{completionPct}%</span>
                    </>
                  ) : null}
                </div>
                <p className="mt-1.5 text-xs text-slate-500">Updated: {new Date(plan.updatedAt).toLocaleString()}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/plans/${plan.id}`}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Open
                </Link>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  onClick={() => handleDuplicate(plan)}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  onClick={() => downloadTextFile(exportPlanAsJson(plan), `${plan.id}.json`, "application/json")}
                >
                  Export
                </button>
                <button
                  type="button"
                  className="rounded-md border border-rose-300 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50"
                  onClick={() => handleDelete(plan.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </article>
          );
        })}
      </div>
    </div>
  );
}
