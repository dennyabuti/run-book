import Link from "next/link";

export default function Home() {
  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">RunBook v1</p>
        <h1 className="mt-2 font-[family-name:var(--font-heading)] text-4xl font-semibold tracking-tight text-slate-900">
          Plan, execute, and report manual testing from one local workspace.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          This implementation is frontend-only and stores all state in IndexedDB. Use settings to connect AI providers and Jira context, then create plans and execute them asynchronously through JSON sharing.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/plans" className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600">
            Open Plans
          </Link>
          <Link href="/settings" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Configure Providers
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Test Plan Builder</h2>
          <p className="mt-2 text-sm text-slate-600">Create plans manually or generate structured cases from natural language with optional Jira context.</p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Execution Tracking</h2>
          <p className="mt-2 text-sm text-slate-600">Track pass/fail/blocked/skip outcomes and actual behavior while executing each case.</p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Import and Export</h2>
          <p className="mt-2 text-sm text-slate-600">Share work asynchronously via human-readable JSON exports, then resume execution after import.</p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Reporting</h2>
          <p className="mt-2 text-sm text-slate-600">Generate structured test reports and export to JSON or PDF from browser-rendered output.</p>
        </article>
      </div>
    </section>
  );
}
