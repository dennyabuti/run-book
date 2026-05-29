import { PlanEditor } from "@/components/plans/PlanEditor";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PlanDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold text-slate-900">Plan Editor</h1>
      <PlanEditor planId={id} />
    </section>
  );
}
