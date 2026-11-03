import Link from "next/link";
import PageShell from "../components/PageShell";

export default function QuizzesPage() {
  return (
    <PageShell
      title="Quizzes"
      description="Manage assessments, submissions, and results."
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Assessment Center</h2>
            <p className="text-sm text-slate-500">Published and draft quizzes</p>
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
            ["React Knowledge Check", "14 attempts", "Published"],
            ["UX Principles Quiz", "9 attempts", "Review"],
            ["Storytelling Fundamentals", "22 attempts", "Published"],
          ].map(([title, attempts, status]) => (
            <div
              key={title}
              className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div>
                <p className="font-semibold text-slate-900">{title}</p>
                <p className="text-sm text-slate-500">{attempts}</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                {status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
