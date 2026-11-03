
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageShell from "../components/PageShell";
import { supabase } from "@/src/lib/supabase/client";

type Course = {
  id: string;
  title: string;
  instructor_id: string | null;
};

type Enrollment = {
  course_id: string;
  student_id: string;
  progress_percent: number | null;
  enrollment_status: string;
};

type CourseProgress = {
  id: string;
  title: string;
  students: number;
  completion: number;
};

type UserRole = "admin" | "instructor" | "student";

export default function ProgressPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([]);
  const [summary, setSummary] = useState({
    activeStudents: 0,
    completionRate: 0,
    totalAssignments: 0,
  });

  useEffect(() => {
    async function loadProgress() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error("Please log in to view progress.");
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;

        const role = (profile as { role: string } | null)?.role;

        if (
          role !== "admin" &&
          role !== "instructor" &&
          role !== "student"
        ) {
          throw new Error("Your account does not have permission to view this page.");
        }

        setUserRole(role);

        let courseQuery = supabase
          .from("courses")
          .select("id, title, instructor_id");

        if (role === "instructor") {
          courseQuery = courseQuery.eq("instructor_id", user.id);
        }

        const { data: courseData, error: courseError } = await courseQuery;

        if (courseError) throw courseError;

        let availableCourses = (courseData ?? []) as Course[];

        // Students can only see courses in which they are enrolled.
        if (role === "student") {
          const { data: studentEnrollments, error: studentEnrollmentError } =
            await supabase
              .from("enrollments")
              .select("course_id, student_id, progress_percent, enrollment_status")
              .eq("student_id", user.id)
              .in("enrollment_status", ["active", "completed"]);

          if (studentEnrollmentError) throw studentEnrollmentError;

          const ownEnrollments = (studentEnrollments ?? []) as Enrollment[];
          const enrolledCourseIds = ownEnrollments.map((item) => item.course_id);

          availableCourses = availableCourses.filter((course) =>
            enrolledCourseIds.includes(course.id)
          );
        }

        const courseIds = availableCourses.map((course) => course.id);

        if (courseIds.length === 0) {
          setCourseProgress([]);
          setSummary({
            activeStudents: 0,
            completionRate: 0,
            totalAssignments: 0,
          });
          return;
        }

        let enrollmentQuery = supabase
          .from("enrollments")
          .select("course_id, student_id, progress_percent, enrollment_status")
          .in("course_id", courseIds)
          .in("enrollment_status", ["active", "completed"]);

        if (role === "student") {
          enrollmentQuery = enrollmentQuery.eq("student_id", user.id);
        }

        const { data: enrollmentData, error: enrollmentError } =
          await enrollmentQuery;

        if (enrollmentError) throw enrollmentError;

        const enrollments = (enrollmentData ?? []) as Enrollment[];

        const { data: assignmentData, error: assignmentError } =
          await supabase
            .from("assignments")
            .select("id, course_id")
            .in("course_id", courseIds);

        if (assignmentError) throw assignmentError;

        const progressList: CourseProgress[] = availableCourses.map(
          (course) => {
            const courseEnrollments = enrollments.filter(
              (enrollment) => enrollment.course_id === course.id
            );

            const totalProgress = courseEnrollments.reduce(
              (total, enrollment) =>
                total + Number(enrollment.progress_percent ?? 0),
              0
            );

            const average =
              courseEnrollments.length > 0
                ? Math.round(totalProgress / courseEnrollments.length)
                : 0;

            return {
              id: course.id,
              title: course.title,
              students: courseEnrollments.length,
              completion: average,
            };
          }
        );

        const uniqueStudents = new Set(
          enrollments.map((enrollment) => enrollment.student_id)
        );

        const totalProgress = enrollments.reduce(
          (total, enrollment) =>
            total + Number(enrollment.progress_percent ?? 0),
          0
        );

        const completionRate =
          enrollments.length > 0
            ? Math.round(totalProgress / enrollments.length)
            : 0;

        setCourseProgress(progressList);
        setSummary({
          activeStudents: uniqueStudents.size,
          completionRate,
          totalAssignments: assignmentData?.length ?? 0,
        });
      } catch (err) {
        console.error("Progress page error:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load progress data."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProgress();
  }, []);

  const isStudent = userRole === "student";

  return (
    <PageShell
      title="Progress"
      description="Review learner milestones and completion trends."
    >
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Loading progress...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">
                {isStudent ? "My Course Progress" : "Completion Overview"}
              </h2>

              <div className="mt-5 space-y-5">
                {courseProgress.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    {isStudent
                      ? "You are not enrolled in any courses yet."
                      : "No courses are available to show."}
                  </p>
                ) : (
                  courseProgress.map((course) => (
                    <div key={course.id}>
                      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-slate-700">
                          {course.title}
                        </span>
                        <span className="text-slate-500">
                          {course.completion}%
                        </span>
                      </div>

                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-2.5 rounded-full bg-emerald-500"
                          style={{ width: `${course.completion}%` }}
                        />
                      </div>

                      <p className="mt-1 text-xs text-slate-400">
                        {isStudent
                          ? "Your course progress"
                          : `${course.students} enrolled students`}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">
                Quick Summary
              </h2>

              <div className="mt-5 space-y-3">
                {[
                  [
                    isStudent ? "My Enrolled Courses" : "Students active",
                    isStudent
                      ? courseProgress.length
                      : summary.activeStudents,
                  ],
                  [
                    isStudent ? "My Completion" : "Completion rate",
                    `${summary.completionRate}%`,
                  ],
                  ["Total assignments", summary.totalAssignments],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-emerald-600"
            >
              Back to Dashboard
            </Link>
          </div>
        </>
      )}
    </PageShell>
  );
}
