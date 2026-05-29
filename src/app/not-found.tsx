import Link from "next/link";

export default function NotFound() {
  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-3xl font-bold text-slate-900">Page not found</h1>
      <p className="text-sm text-slate-600">The requested page does not exist.</p>
      <Link href="/" className="inline-block text-sm font-semibold text-sky-700 hover:underline">
        Back to dashboard
      </Link>
    </section>
  );
}
