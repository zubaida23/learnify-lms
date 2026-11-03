"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import { supabase } from "@/src/lib/supabase/client";

type StudentProfileRow = {
  id: string;
  full_name: string;
  email: string;
  status?: string | null;
  created_at?: string | null;
};

type EnrollmentRow = {
  student_id: string;
  course_id: string;
  enrollment_status: string;
  progress_percent: number | null;
  enrolled_at?: string | null;
  courses?: {
    id: string;
    title: string;
  } | null;
};

type StudentDirectoryRow = StudentProfileRow & {
  courseName: string;
  courseStatus: string;
  progressLabel: string;
};

const formatEnrollmentStatus = (status?: string | null) => {
  if (!status) return "not_enrolled";
  return status.toLowerCase();
};

const getStatusBadgeClasses = (status?: string | null) => {
  const normalized = formatEnrollmentStatus(status);

  if (normalized === "completed") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (normalized === "paused") {
    return "bg-amber-100 text-amber-700";
  }

  if (normalized === "cancelled") {
    return "bg-rose-100 text-rose-700";
  }

  if (normalized === "active") {
    return "bg-sky-100 text-sky-700";
  }

  return "bg-slate-100 text-slate-600";
};

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentDirectoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadStudents = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: profiles, error: profilesError } = (await supabase
          .from("profiles")
          .select("id, full_name, email, status, created_at")
          .eq("role", "student")
          .order("full_name", { ascending: true })) as {
          data: StudentProfileRow[] | null;
          error: { message?: string } | null;
        };

        if (profilesError) {
          throw profilesError;
        }

        const studentIds = (profiles ?? []).map((profile) => profile.id);

        let enrollments: EnrollmentRow[] = [];

        if (studentIds.length > 0) {
          const { data: enrollmentRows, error: enrollmentError } = (await supabase
            .from("enrollments")
            .select(
              "student_id, course_id, enrollment_status, progress_percent, enrolled_at, courses:course_id(id, title)"
            )
            .in("student_id", studentIds)) as {
            data: EnrollmentRow[] | null;
            error: { message?: string } | null;
          };

          if (enrollmentError) {
            throw enrollmentError;
          }

          enrollments = enrollmentRows ?? [];
        }

        const enrollmentMap = new Map<string, EnrollmentRow[]>();

        enrollments.forEach((enrollment) => {
          const existing = enrollmentMap.get(enrollment.student_id) ?? [];
          existing.push(enrollment);
          enrollmentMap.set(enrollment.student_id, existing);
        });

        const nextStudents = (profiles ?? []).map((profile) => {
          const studentEnrollments = enrollmentMap.get(profile.id) ?? [];
          const primaryEnrollment = studentEnrollments[0];
          const courseNames = studentEnrollments
            .map((enrollment) => enrollment.courses?.title)
            .filter((title): title is string => Boolean(title))
            .join(", ");

          const progressValue =
            typeof primaryEnrollment?.progress_percent === "number"
              ? primaryEnrollment.progress_percent
              : null;

          return {
            ...profile,
            courseName: courseNames || "No active enrollment",
            courseStatus: formatEnrollmentStatus(primaryEnrollment?.enrollment_status),
            progressLabel:
              progressValue === null
                ? "No progress saved"
                : `${Math.round(progressValue)}%`,
          } satisfies StudentDirectoryRow;
        });

        if (isMounted) {
          setStudents(nextStudents);
        }
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : "Unable to load student data.";

        if (isMounted) {
          setStudents([]);
          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadStudents();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <PageShell
      title="Students"
      description="Review learner enrollment and performance."
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Student Directory</h2>
            <p className="text-sm text-slate-500">Active and recently active learners</p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-emerald-600"
          >
            Dashboard
          </Link>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
            Loading students...
          </div>
        ) : students.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <h3 className="text-lg font-semibold text-slate-900">No students yet</h3>
            <p className="mt-2 text-sm text-slate-500">
              Student profiles will appear here once they are created.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {students.map((student) => (
              <div
                key={student.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-900">{student.full_name}</p>
                  <p className="text-sm text-slate-500">{student.email}</p>
                </div>

                <div className="text-sm text-slate-600 md:text-right">
                  <p className="font-medium text-slate-700">{student.courseName}</p>
                  <p className="text-xs text-slate-500">
                    Enrollment status: {student.courseStatus}
                  </p>
                </div>

                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClasses(
                    student.courseStatus
                  )}`}
                >
                  {student.progressLabel}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
