import type { ReactNode } from "react";

type StatCardProps = {
  title: string;
  value: string;
  change: string;
  icon: ReactNode;
};

export default function StatCard({ title, value, change, icon }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm">
        <span className="rounded-full bg-emerald-100 px-2 py-1 font-medium text-emerald-700">{change}</span>
        <span className="text-slate-500">vs last month</span>
      </div>
    </div>
  );
}
