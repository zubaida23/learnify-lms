
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageShell from "../../components/PageShell";
import { supabase } from "@/src/lib/supabase/client";

type Course = {
  id: string;
  title: string;
  status: string | null;
  is_published: boolean | null;
};

type Enrollment = {
  course_id: string;
  student_id: string;
  progress_percent: number | null;
  enrollment_status: string;
};

type CoursePerformance = {
  id: string;
  title: string;
  learners: number;
  completion: number;
};

export default function TeacherDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courses, setCourses] = useState<CoursePerformance[]>([]);
  const [stats, setStats] = useState({
    activeCourses: 0,
    students: 0,
    assignments: 0,
    averageCompletion: 0,
  });

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error("Please log in to view your instructor dashboard.");
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;

        const userRole = (profile as { role: string } | null)?.role;

        if (userRole !== "instructor") {
          throw new Error("Only instructors can access this dashboard.");
        }

        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("id, title, status, is_published")
          .eq("instructor_id", user.id);

        if (courseError) throw courseError;

        const assignedCourses = (courseData ?? []) as Course[];
        const courseIds = assignedCourses.map((course) => course.id);

        if (courseIds.length === 0) {
          setCourses([]);
          setStats({
            activeCourses: 0,
            students: 0,
            assignments: 0,
            averageCompletion: 0,
          });
          return;
        }

        const { data: enrollmentData, error: enrollmentError } =
          await supabase
            .from("enrollments")
            .select(
              "course_id, student_id, progress_percent, enrollment_status"
            )
            .in("course_id", courseIds)
            .in("enrollment_status", ["active", "completed"]);

        if (enrollmentError) throw enrollmentError;

        const enrollments = (enrollmentData ?? []) as Enrollment[];

        const { data: assignmentData, error: assignmentError } =
          await supabase
            .from("assignments")
            .select("id, course_id")
            .in("course_id", courseIds);

        if (assignmentError) throw assignmentError;

        const assignmentCount = assignmentData?.length ?? 0;

        const performance: CoursePerformance[] = assignedCourses.map(
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
              learners: courseEnrollments.length,
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

        const averageCompletion =
          enrollments.length > 0
            ? Math.round(totalProgress / enrollments.length)
            : 0;

        setCourses(performance);
        setStats({
          activeCourses: assignedCourses.filter(
            (course) =>
              course.is_published === true && course.status === "published"
          ).length,
          students: uniqueStudents.size,
          assignments: assignmentCount,
          averageCompletion,
        });
      } catch (err) {
        console.error("Instructor dashboard error:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load instructor dashboard."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const instructorStats = [
    { label: "Active Courses", value: stats.activeCourses },
    { label: "Students Enrolled", value: stats.students },
    { label: "Course Assignments", value: stats.assignments },
    { label: "Average Completion", value: `${stats.averageCompletion}%` },
  ];

  return (
    <PageShell
      title="Instructor Dashboard"
      description="Monitor your assigned courses, learner engagement, and teaching outcomes."
    >
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Loading instructor dashboard...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {instructorStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="mt-3 text-3xl font-bold text-slate-900">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Course Performance
                  </h2>
                  <p className="text-sm text-slate-500">
                    Your assigned courses and learner progress
                  </p>
                </div>
                <Link
                  href="/courses"
                  className="text-sm font-medium text-emerald-600"
                >
                  Course catalog
                </Link>
              </div>

              {courses.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
                  No courses have been assigned to you yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {course.title}
                          </p>
                          <p className="text-sm text-slate-500">
                            {course.learners} enrolled students
                          </p>
                        </div>
                        <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                          {course.completion}%
                        </span>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${course.completion}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">
                Instructor Actions
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Manage your teaching activities and student submissions.
              </p>

              <div className="mt-5 space-y-3">
                <Link
                  href="/teacher/submissions"
                  className="block rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-emerald-700"
                >
                  Review submissions
                </Link>

                <Link
                  href="/courses"
                  className="block rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  View courses
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </PageShell>
  );
}
