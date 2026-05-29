import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const headingFont = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
});

const bodyFont = IBM_Plex_Mono({
  variable: "--font-body",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RunBook",
  description: "Frontend-only manual testing coordination workspace",
};

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/plans", label: "Plans" },
  { href: "/executions", label: "Executions" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${headingFont.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--page-bg)] text-slate-900">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-10 md:px-6">
          <header className="sticky top-0 z-20 mt-4 rounded-xl border border-slate-800/10 bg-white/85 p-4 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-900">
                  RunBook
                </p>
                <p className="text-xs text-slate-600">Local-first manual testing coordination</p>
              </div>
              <nav className="flex flex-wrap gap-2 text-sm">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>

          <main className="mt-6 flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
