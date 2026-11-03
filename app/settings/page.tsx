import Link from "next/link";
import PageShell from "../components/PageShell";

export default function SettingsPage() {
  return (
    <PageShell
      title="Settings"
      description="Configure platform preferences and admin controls."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">General Settings</h2>
          <div className="mt-5 space-y-4">
            {[
              ["Platform name", "LearnHub LMS"],
              ["Timezone", "UTC"],
              ["Default language", "English"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-1 font-medium text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Security</h2>
          <div className="mt-5 space-y-3">
            {[
              "Password policy",
              "Two-factor authentication",
              "Session timeout",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
              >
                {item}
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
