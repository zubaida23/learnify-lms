import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 md:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="grid min-h-[760px] lg:grid-cols-2">
          <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-8 text-white lg:border-b-0 lg:border-r lg:p-10">
            <div className="relative z-10 flex h-full flex-col">
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-lg font-bold ring-1 ring-white/20 backdrop-blur-sm">
                  LMS
                </div>
                <div>
                  <p className="text-lg font-bold tracking-tight">Learnify LMS</p>
                  <p className="text-xs text-emerald-100">Management Suite</p>
                </div>
              </div>

              <div className="max-w-md">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-100">
                  Student Success
                </p>
                <h1 className="mt-4 text-4xl font-bold tracking-tight">
                  Learn faster. Teach smarter. Grow together.
                </h1>
                <p className="mt-5 text-base text-emerald-50/90">
                  Streamline enrollment, assignments, quizzes, and progress with a modern,
                  focused learning platform built for institutions.
                </p>
              </div>

              <div className="mt-auto grid gap-4 pt-8 text-sm text-emerald-50/90 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-sm">
                  <p className="text-2xl font-bold text-white">12k+</p>
                  <p className="mt-1">Active learners</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-sm">
                  <p className="text-2xl font-bold text-white">364</p>
                  <p className="mt-1">Expert mentors</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-sm">
                  <p className="text-2xl font-bold text-white">94%</p>
                  <p className="mt-1">Course completion</p>
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.14),_transparent_35%)]" />
          </div>

          <div className="flex items-center justify-center p-6 sm:p-8 lg:p-10">
            <div className="w-full max-w-md">
              <div className="mb-8">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-600">
                  Welcome
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{title}</h2>
                <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
              </div>

              {children}

              <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>

              <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                <span>Secure access</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
