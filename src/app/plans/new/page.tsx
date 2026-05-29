"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPlan } from "@/lib/plans/factory";
import { savePlan } from "@/lib/repositories/plansRepo";

export const dynamic = "force-dynamic";

export default function NewPlanPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Creating plan...");

  useEffect(() => {
    const plan = createPlan();
    savePlan(plan)
      .then(() => router.replace(`/plans/${plan.id}`))
      .catch((err: unknown) => {
        setMessage(err instanceof Error ? err.message : "Failed to create plan.");
      });
  }, [router]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-3xl font-bold text-slate-900">New Plan</h1>
      <p className="mt-3 text-sm text-slate-600">{message}</p>
    </section>
  );
}
