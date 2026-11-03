const data = [42, 56, 48, 68, 72, 88, 96];

export default function EnrollmentChart() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Student Enrollment Overview</h3>
          <p className="text-sm text-slate-500">Monthly student growth</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">+18.2%</span>
      </div>

      <div className="flex h-52 items-end gap-3">
        {data.map((value, index) => (
          <div key={index} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="w-full rounded-t-xl bg-gradient-to-t from-emerald-500 to-emerald-300"
              style={{ height: `${value}%` }}
            />
            <span className="text-xs text-slate-500">{["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"][index]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
