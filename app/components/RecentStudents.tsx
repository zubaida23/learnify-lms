import React from 'react';

const students = [
  { name: "Ava Thompson", email: "ava.thompson@email.com", course: "Advanced React Patterns", progress: "78%", status: "Active" },
  { name: "Daniel Brooks", email: "daniel.brooks@email.com", course: "UX Research Essentials", progress: "64%", status: "Reviewing" },
  { name: "Sophia Nguyen", email: "sophia.nguyen@email.com", course: "Data Storytelling", progress: "92%", status: "Completed" },
  { name: "Liam Patel", email: "liam.patel@email.com", course: "Design Systems", progress: "52%", status: "Active" },
];

const RecentStudents = () => {
  return (
    <div className="p-4">
      <h2 className="text-lg font-bold">Recent Students</h2>
      <div className="space-y-3">
        {students.map((student) => (
          <div key={student.email} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900">{student.name}</p>
              <p className="truncate text-sm text-slate-500">{student.email}</p>
              <p className="mt-1 text-xs text-slate-500">{student.course}</p>
            </div>

            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">{student.progress}</p>
              <span
                className={`mt-1 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${
                  student.status === "Completed"
                    ? "bg-emerald-100 text-emerald-700"
                    : student.status === "Reviewing"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-sky-100 text-sky-700"
                }`}
              >
                {student.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentStudents;