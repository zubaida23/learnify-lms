const segments = [
  { label: 'Beginner', value: 20, color: 'bg-emerald-500' },
  { label: 'Intermediate', value: 35, color: 'bg-emerald-400' },
  { label: 'Advanced', value: 25, color: 'bg-emerald-300' },
  { label: 'Mastery', value: 20, color: 'bg-slate-200' },
];

export default function ProgressChart() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Course Progress</h3>
          <p className="text-sm text-slate-500">Completion by level</p>
        </div>
      </div>

      <div className="space-y-4">
        {segments.map((segment) => (
          <div key={segment.label}>
            <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
              <span>{segment.label}</span>
              <span>{segment.value}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${segment.color}`} style={{ width: `${segment.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
