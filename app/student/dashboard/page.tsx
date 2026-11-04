"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PageShell from "../../components/PageShell";
import ProtectedRoute from "../../auth/protected-route";
import { supabase } from "@/src/lib/supabase/client";

type DashboardAssignment = {
  id: string;
  title: string;
  due_date: string | null;
  status: string | null;
};

type EnrollmentRow = {
  course_id: string;
  progress_percent: number | null;
  enrollment_status: string;
  courses: {
    id: string;
    title: string;
  } | null;
};

type DashboardCourse = {
  id: string;
  title: string;
  progress: number;
};

type DashboardQuizResult = {
  id: string;
  title: string;
  percentage: number;
  submitted_at: string;
};

type QuizAttemptRow = {
  id: string;
  percentage: number | null;
  submitted_at: string | null;
  status: string;
  quizzes: {
    title: string;
  } | null;
};

type RecentActivityItem = {
  id: string;
  description: string;
  date: string;
};

type ActivitySubmissionRow = {
  id: string;
  submitted_at: string | null;
  created_at: string | null;
  assignments: {
    title: string;
  } | null;
};

type ActivityEnrollmentRow = {
  id: string;
  enrolled_at: string | null;
  created_at: string | null;
  courses: {
    title: string;
  } | null;
};

type ActivityLessonRow = {
  id: string;
  status: string | null;
  progress_percent: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  lessons: {
    title: string;
  } | null;
};

const formatDueDate = (date: string | null) => {
  if (!date) return "No due date";

  const due = new Date(date);
  if (Number.isNaN(due.getTime())) return "No due date";

  return `Due: ${due.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
};

const formatActivityDate = (date: string) => {
  const activityDate = new Date(date);

  if (Number.isNaN(activityDate.getTime())) return "";

  return activityDate.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function StudentDashboardPage() {
  const [upcomingAssignments, setUpcomingAssignments] = useState<
    DashboardAssignment[]
  >([]);
  const [courses, setCourses] = useState<DashboardCourse[]>([]);
  const [quizResults, setQuizResults] = useState<DashboardQuizResult[]>([]);
  const [recentActivity, setRecentActivity] = useState<
    RecentActivityItem[]
  >([]);

  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState<string | null>(null);

  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);

  const [quizLoading, setQuizLoading] = useState(true);
  const [quizError, setQuizError] = useState<string | null>(null);

  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);

  // Load enrolled courses
  useEffect(() => {
    const loadEnrolledCourses = async () => {
      setCoursesLoading(true);
      setCoursesError(null);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setCourses([]);
          return;
        }

        const { data, error } = await supabase
          .from("enrollments")
          .select(`
            course_id,
            progress_percent,
            enrollment_status,
            courses (
              id,
              title
            )
          `)
          .eq("student_id", session.user.id)
          .in("enrollment_status", ["active", "completed"]);

        if (error) throw error;

        const actualCourses = ((data ?? []) as unknown as EnrollmentRow[])
          .filter((row) => row.courses !== null)
          .map((row) => ({
            id: row.courses!.id,
            title: row.courses!.title,
            progress: Math.min(
              100,
              Math.max(0, Number(row.progress_percent ?? 0))
            ),
          }));

        setCourses(actualCourses);
      } catch (error) {
        console.error("Dashboard courses error:", error);
        setCoursesError(
          error instanceof Error ? error.message : "Unable to load courses."
        );
      } finally {
        setCoursesLoading(false);
      }
    };

    void loadEnrolledCourses();
  }, []);

  // Load upcoming assignments
  useEffect(() => {
    const loadUpcomingAssignments = async () => {
      setAssignmentsLoading(true);
      setAssignmentsError(null);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setUpcomingAssignments([]);
          return;
        }

        const { data: enrollments, error: enrollmentError } = await supabase
          .from("enrollments")
          .select("course_id")
          .eq("student_id", session.user.id)
          .in("enrollment_status", ["active", "completed"]);

        if (enrollmentError) throw enrollmentError;

        const courseIds = [
          ...new Set(
            ((enrollments ?? []) as { course_id: string }[])
              .map((row) => row.course_id)
              .filter(Boolean)
          ),
        ];

        if (courseIds.length === 0) {
          setUpcomingAssignments([]);
          return;
        }

        const { data: assignmentRows, error: assignmentError } =
          await supabase
            .from("assignments")
            .select("id, title, due_date")
            .in("course_id", courseIds)
            .eq("is_published", true)
            .order("due_date", { ascending: true, nullsFirst: false });

        if (assignmentError) throw assignmentError;

        const assignments = (assignmentRows ?? []) as Omit<
          DashboardAssignment,
          "status"
        >[];

        if (assignments.length === 0) {
          setUpcomingAssignments([]);
          return;
        }

        const { data: submissions, error: submissionError } = await supabase
          .from("assignment_submissions")
          .select("assignment_id, status")
          .eq("student_id", session.user.id)
          .in(
            "assignment_id",
            assignments.map((item) => item.id)
          );

        if (submissionError) throw submissionError;

        // TypeScript fix for assignment submissions
        const submissionRows = (submissions ?? []) as unknown as {
          assignment_id: string;
          status: string | null;
        }[];

        const submissionMap = new Map(
          submissionRows.map((item) => [
            item.assignment_id,
            item.status,
          ])
        );

        const pendingAssignments = assignments
          .filter((item) => submissionMap.get(item.id) !== "graded")
          .slice(0, 3)
          .map((item) => ({
            ...item,
            status: submissionMap.get(item.id) ?? "Not submitted",
          }));

        setUpcomingAssignments(pendingAssignments);
      } catch (error) {
        console.error("Dashboard assignments error:", error);
        setAssignmentsError(
          error instanceof Error ? error.message : "Unable to load assignments."
        );
      } finally {
        setAssignmentsLoading(false);
      }
    };

    void loadUpcomingAssignments();
  }, []);

  // Load quiz results
  useEffect(() => {
    const loadQuizResults = async () => {
      setQuizLoading(true);
      setQuizError(null);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setQuizResults([]);
          return;
        }

        const { data, error } = await supabase
          .from("quiz_attempts")
          .select(`
            id,
            percentage,
            submitted_at,
            status,
            quizzes (
              title
            )
          `)
          .eq("student_id", session.user.id)
          .not("submitted_at", "is", null)
          .order("submitted_at", { ascending: false });

        if (error) throw error;

        const results = ((data ?? []) as unknown as QuizAttemptRow[])
          .filter(
            (attempt) =>
              attempt.submitted_at !== null &&
              attempt.quizzes !== null &&
              attempt.percentage !== null
          )
          .map((attempt) => ({
            id: attempt.id,
            title: attempt.quizzes!.title,
            percentage: Number(attempt.percentage),
            submitted_at: attempt.submitted_at!,
          }))
          .slice(0, 3);

        setQuizResults(results);
      } catch (error) {
        console.error("Dashboard quiz results error:", error);
        setQuizError(
          error instanceof Error
            ? error.message
            : "Unable to load quiz results."
        );
      } finally {
        setQuizLoading(false);
      }
    };

    void loadQuizResults();
  }, []);

  // Load recent activity
  useEffect(() => {
    const loadRecentActivity = async () => {
      setActivityLoading(true);
      setActivityError(null);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setRecentActivity([]);
          return;
        }

        const [submissionResult, enrollmentResult, lessonResult] =
          await Promise.all([
            supabase
              .from("assignment_submissions")
              .select(`
                id,
                submitted_at,
                created_at,
                assignments (
                  title
                )
              `)
              .eq("student_id", session.user.id)
              .not("submitted_at", "is", null),

            supabase
              .from("enrollments")
              .select(`
                id,
                enrolled_at,
                created_at,
                courses (
                  title
                )
              `)
              .eq("student_id", session.user.id),

            supabase
              .from("lesson_progress")
              .select(`
                id,
                status,
                progress_percent,
                started_at,
                completed_at,
                created_at,
                updated_at,
                lessons (
                  title
                )
              `)
              .eq("student_id", session.user.id),
          ]);

        if (submissionResult.error) throw submissionResult.error;
        if (enrollmentResult.error) throw enrollmentResult.error;
        if (lessonResult.error) throw lessonResult.error;

        const activities: RecentActivityItem[] = [];

        const submissions =
          (submissionResult.data ?? []) as unknown as ActivitySubmissionRow[];

        submissions.forEach((submission) => {
          const date = submission.submitted_at ?? submission.created_at;

          if (!date || !submission.assignments?.title) return;

          activities.push({
            id: `submission-${submission.id}`,
            description: `Submitted assignment "${submission.assignments.title}"`,
            date,
          });
        });

        const enrollments =
          (enrollmentResult.data ?? []) as unknown as ActivityEnrollmentRow[];

        enrollments.forEach((enrollment) => {
          const date = enrollment.enrolled_at ?? enrollment.created_at;

          if (!date || !enrollment.courses?.title) return;

          activities.push({
            id: `enrollment-${enrollment.id}`,
            description: `Enrolled in "${enrollment.courses.title}"`,
            date,
          });
        });

        const lessonProgress =
          (lessonResult.data ?? []) as unknown as ActivityLessonRow[];

        lessonProgress.forEach((lesson) => {
          if (!lesson.lessons?.title) return;

          const isCompleted =
            lesson.status?.toLowerCase() === "completed" ||
            Number(lesson.progress_percent ?? 0) >= 100;

          const date = isCompleted
            ? lesson.completed_at ?? lesson.updated_at ?? lesson.created_at
            : lesson.started_at ?? lesson.created_at ?? lesson.updated_at;

          if (!date) return;

          activities.push({
            id: `lesson-${lesson.id}`,
            description: isCompleted
              ? `Completed lesson "${lesson.lessons.title}"`
              : `Started lesson "${lesson.lessons.title}"`,
            date,
          });
        });

        activities.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setRecentActivity(activities.slice(0, 5));
      } catch (error) {
        console.error("Dashboard recent activity error:", error);
        setActivityError(
          error instanceof Error
            ? error.message
            : "Unable to load recent activity."
        );
      } finally {
        setActivityLoading(false);
      }
    };

    void loadRecentActivity();
  }, []);

  const averageProgress =
    courses.length > 0
      ? Math.round(
          courses.reduce((total, course) => total + course.progress, 0) /
            courses.length
        )
      : 0;

  const quizAverage =
    quizResults.length > 0
      ? Math.round(
          quizResults.reduce((total, quiz) => total + quiz.percentage, 0) /
            quizResults.length
        )
      : 0;

  return (
    <ProtectedRoute allowedRole="student">
      <PageShell
        title="Student Dashboard"
        description="Track your courses, assignments, and learning milestones."
      >
        <div className="grid gap-6 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Enrolled Courses</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {coursesLoading
                ? "..."
                : courses.length.toString().padStart(2, "0")}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Average Progress</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {coursesLoading ? "..." : `${averageProgress}%`}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Assignments Due</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {assignmentsLoading
                ? "..."
                : upcomingAssignments.length.toString().padStart(2, "0")}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Quiz Average</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {quizLoading ? "..." : `${quizAverage}%`}
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  My Enrolled Courses
                </h2>
                <p className="text-sm text-slate-500">
                  Current learning roadmap
                </p>
              </div>

              <Link
                href="/courses"
                className="text-sm font-medium text-emerald-600"
              >
                Browse courses
              </Link>
            </div>

            <div className="space-y-4">
              {coursesLoading ? (
                <p className="text-sm text-slate-500">Loading courses...</p>
              ) : coursesError ? (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  {coursesError}
                </p>
              ) : courses.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  You have not enrolled in any courses yet.
                </p>
              ) : (
                courses.map((course) => (
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
                          Your learning progress
                        </p>
                      </div>

                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        {course.progress}%
                      </span>
                    </div>

                    <div className="mt-3 h-2.5 rounded-full bg-slate-200">
                      <div
                        className="h-2.5 rounded-full bg-emerald-500"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-semibold text-slate-900">
                Upcoming Assignments
              </h2>

              <Link
                href="/student/assignments"
                className="text-sm font-medium text-emerald-600"
              >
                View all
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {assignmentsLoading ? (
                <p className="text-sm text-slate-500">
                  Loading assignments...
                </p>
              ) : assignmentsError ? (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  {assignmentsError}
                </p>
              ) : upcomingAssignments.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  No upcoming assignments found.
                </p>
              ) : (
                upcomingAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-900">
                        {assignment.title}
                      </p>

                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700">
                        {assignment.status}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      {formatDueDate(assignment.due_date)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Quiz Results
            </h2>

            <div className="mt-5 space-y-3">
              {quizLoading ? (
                <p className="text-sm text-slate-500">
                  Loading quiz results...
                </p>
              ) : quizError ? (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  {quizError}
                </p>
              ) : quizResults.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  You have not completed any quizzes yet.
                </p>
              ) : (
                quizResults.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {quiz.title}
                      </p>
                      <p className="text-sm text-slate-500">
                        {new Date(quiz.submitted_at).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </p>
                    </div>

                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {Math.round(quiz.percentage)}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Recent Activity
            </h2>

            <div className="mt-5 space-y-3">
              {activityLoading ? (
                <p className="text-sm text-slate-500">
                  Loading recent activity...
                </p>
              ) : activityError ? (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  {activityError}
                </p>
              ) : recentActivity.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  No recent activity yet. Start a lesson or submit an
                  assignment to see your activity here.
                </p>
              ) : (
                recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="text-sm font-medium text-slate-700">
                      {item.description}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {formatActivityDate(item.date)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </PageShell>
    </ProtectedRoute>
  );
}