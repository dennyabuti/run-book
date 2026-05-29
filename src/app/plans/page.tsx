import { PlansDashboard } from "@/components/plans/PlansDashboard";

export const dynamic = "force-dynamic";

export default function PlansPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold text-slate-900">Test Plans</h1>
      <p className="text-sm text-slate-600">Create, import, and manage local-first plans.</p>
      <PlansDashboard />
    </section>
  );
}
