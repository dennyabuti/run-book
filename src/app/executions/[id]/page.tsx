import { ExecutionDetail } from "@/components/executions/ExecutionDetail";

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function ExecutionDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Test Session</h1>
      <p className="text-sm text-slate-500">Session ID: {id}</p>
      <ExecutionDetail executionId={id} />
    </section>
  );
}
