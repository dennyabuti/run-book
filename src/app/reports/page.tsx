import { ReportsList } from "@/components/reports/ReportsList";

export const dynamic = "force-dynamic";

export default function ReportsPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
      <p className="text-sm text-slate-600">Generated summaries from execution sessions.</p>
      <ReportsList />
    </section>
  );
}
