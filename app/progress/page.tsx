import Link from "next/link";
import PageShell from "../components/PageShell";

export default function ProgressPage() {
  return (
    <PageShell
      title="Progress"
      description="Review learner milestones and completion trends."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Completion Overview</h2>
          <div className="mt-5 space-y-4">
            {[
              ["Advanced React Patterns", "78%"],
              ["UX Research Essentials", "64%"],
              ["Data Storytelling", "92%"],
            ].map(([course, percent]) => (
              <div key={course}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{course}</span>
                  <span className="text-slate-500">{percent}</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div
                    className="h-2.5 rounded-full bg-emerald-500"
                    style={{ width: percent }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Quick Summary</h2>
          <div className="mt-5 space-y-3">
            {[
              ["Students active", "1,284"],
              ["Completion rate", "86%"],
              ["On-time submissions", "92%"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Link href="/dashboard" className="text-sm font-medium text-emerald-600">
          Back to Dashboard
        </Link>
      </div>
    </PageShell>
  );
}
