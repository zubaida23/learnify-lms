import Link from "next/link";
import PageShell from "../components/PageShell";

export default function TeachersPage() {
  return (
    <PageShell
      title="Teachers"
      description="Manage instructors and course leadership."
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Instructor Team</h2>
            <p className="text-sm text-slate-500">Current teaching staff</p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-emerald-600"
          >
            Dashboard
          </Link>
        </div>

        <div className="space-y-3">
          {[
            ["Sarah Johnson", "Advanced React Patterns"],
            ["Michael Lee", "UX Research Essentials"],
            ["Emma Clark", "Data Storytelling"],
          ].map(([name, course]) => (
            <div
              key={name}
              className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div>
                <p className="font-semibold text-slate-900">{name}</p>
                <p className="text-sm text-slate-500">{course}</p>
              </div>
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                Active
              </span>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
