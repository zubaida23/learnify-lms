
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase/client";

type EnrollmentRecord = {
  student_id: string;
  course_id: string;
  progress_percent: number | null;
  enrollment_status: string;
  created_at: string;
};

type StudentRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type CourseRecord = {
  id: string;
  title: string;
};

type RecentStudent = {
  id: string;
  name: string;
  email: string;
  course: string;
  progress: number;
  status: string;
};

export default function RecentStudents() {
  const [students, setStudents] = useState<RecentStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentStudents = async () => {
      try {
        const { data: enrollmentData, error: enrollmentError } =
          await supabase
            .from("enrollments")
            .select(
              "student_id, course_id, progress_percent, enrollment_status, created_at"
            )
            .order("created_at", { ascending: false })
            .limit(4);

        if (enrollmentError) throw enrollmentError;

        const enrollments = (enrollmentData ??
          []) as unknown as EnrollmentRecord[];

        if (enrollments.length === 0) {
          setStudents([]);
          return;
        }

        const studentIds = [
          ...new Set(enrollments.map((item) => item.student_id)),
        ];

        const courseIds = [
          ...new Set(enrollments.map((item) => item.course_id)),
        ];

        const [studentResult, courseResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", studentIds),

          supabase
            .from("courses")
            .select("id, title")
            .in("id", courseIds),
        ]);

        if (studentResult.error) throw studentResult.error;
        if (courseResult.error) throw courseResult.error;

        const profiles = (studentResult.data ??
          []) as unknown as StudentRecord[];

        const courses = (courseResult.data ??
          []) as unknown as CourseRecord[];

        const recentStudents = enrollments.map((enrollment) => {
          const student = profiles.find(
            (item) => item.id === enrollment.student_id
          );

          const course = courses.find(
            (item) => item.id === enrollment.course_id
          );

          const progress = Math.round(
            Number(enrollment.progress_percent) || 0
          );

          let status = enrollment.enrollment_status || "Active";

          if (status.toLowerCase() === "completed") {
            status = "Completed";
          } else if (status.toLowerCase() === "active") {
            status = "Active";
          } else {
            status =
              status.charAt(0).toUpperCase() + status.slice(1);
          }

          return {
            id: `${enrollment.student_id}-${enrollment.course_id}`,
            name: student?.full_name || "Unknown student",
            email: student?.email || "No email available",
            course: course?.title || "Unknown course",
            progress,
            status,
          };
        });

        setStudents(recentStudents);
      } catch (error) {
        console.error("Recent students error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentStudents();
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-slate-900">
        Recent Students
      </h2>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-500">
          Loading students...
        </p>
      ) : students.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          No enrolled students found.
        </p>
      ) : (
        <div className="space-y-3">
          {students.map((student) => (
            <div
              key={student.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">
                  {student.name}
                </p>

                <p className="truncate text-sm text-slate-500">
                  {student.email}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {student.course}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-sm font-medium text-slate-900">
                  {student.progress}%
                </p>

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
      )}
    </div>
  );
}
