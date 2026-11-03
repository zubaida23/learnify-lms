
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase/client";

type MonthlyEnrollment = {
  month: string;
  count: number;
};

type EnrollmentRecord = {
  enrolled_at: string | null;
};

export default function EnrollmentChart() {
  const [data, setData] = useState<MonthlyEnrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMonthlyEnrollments = async () => {
      try {
        const { data: enrollments, error } = await supabase
          .from("enrollments")
          .select("enrolled_at");

        if (error) throw error;

        const records = (enrollments ?? []) as unknown as EnrollmentRecord[];

        const now = new Date();
        const months: MonthlyEnrollment[] = [];

        for (let i = 6; i >= 0; i--) {
          const date = new Date(
            now.getFullYear(),
            now.getMonth() - i,
            1
          );

          const monthName = date.toLocaleString("en-US", {
            month: "short",
          });

          const count = records.filter((enrollment) => {
            if (!enrollment.enrolled_at) return false;

            const enrolledDate = new Date(enrollment.enrolled_at);

            return (
              enrolledDate.getMonth() === date.getMonth() &&
              enrolledDate.getFullYear() === date.getFullYear()
            );
          }).length;

          months.push({ month: monthName, count });
        }

        setData(months);
      } catch (error) {
        console.error("Enrollment chart error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyEnrollments();
  }, []);

  const maxCount = Math.max(...data.map((item) => item.count), 1);
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Student Enrollment Overview
          </h3>
          <p className="text-sm text-slate-500">
            Monthly student growth
          </p>
        </div>

        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          {total} total
        </span>
      </div>

      {loading ? (
        <div className="flex h-52 items-center justify-center text-sm text-slate-500">
          Loading enrollment data...
        </div>
      ) : (
        <div className="flex h-52 items-end gap-3">
          {data.map((item, index) => (
            <div
              key={`${item.month}-${index}`}
              className="flex flex-1 flex-col items-center gap-2"
            >
              <div
                className="flex h-40 w-full items-end"
                title={`${item.count} enrollments`}
              >
                <div
                  className="w-full rounded-t-xl bg-gradient-to-t from-emerald-500 to-emerald-300 transition-all"
                  style={{
                    height: `${(item.count / maxCount) * 100}%`,
                    minHeight: item.count > 0 ? "4px" : "0px",
                  }}
                />
              </div>

              <span className="text-xs text-slate-500">
                {item.month}
              </span>
            </div>
          ))}
        </div>
      )}

      {!loading && total === 0 && (
        <p className="mt-3 text-center text-xs text-slate-500">
          No enrollment records found for the last seven months.
        </p>
      )}
    </div>
  );
}
