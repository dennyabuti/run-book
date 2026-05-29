"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 p-6">
        <div className="space-y-4 rounded-lg border border-rose-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-rose-700">Something went wrong</h1>
          <p className="text-sm text-slate-600">{error.message ?? "An unexpected error occurred."}</p>
          <button
            type="button"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            onClick={reset}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
