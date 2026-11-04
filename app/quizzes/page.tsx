"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "../components/PageShell";
import ProtectedRoute from "../auth/protected-route";
import { normalizeRole } from "@/src/lib/auth";
import { supabase } from "@/src/lib/supabase/client";

type Role = "admin" | "instructor" | "student";

type Quiz = {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  course_id: string | null;
  created_at: string;
};

type QuizAttempt = {
  quiz_id: string;
};

export default function QuizzesPage() {
  const router = useRouter();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({});
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadQuizzes() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          throw new Error("Session nahi mili. Dobara sign in karein.");
        }

        const profileResult = (await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle()) as {
          data: { role: string } | null;
          error: { message: string } | null;
        };

        if (profileResult.error || !profileResult.data) {
          throw new Error("User profile load nahi ho saki.");
        }

        const userRole = normalizeRole(profileResult.data.role) as Role;

        if (!["admin", "instructor", "student"].includes(userRole)) {
          throw new Error("User role valid nahi hai.");
        }

        if (isMounted) setRole(userRole);

        let quizQuery = supabase
          .from("quizzes")
          .select("id, title, description, is_published, course_id, created_at")
          .order("created_at", { ascending: false });

        if (userRole === "instructor") {
          const coursesResult = (await supabase
            .from("courses")
            .select("id")
            .eq("instructor_id", session.user.id)) as {
            data: { id: string }[] | null;
            error: { message: string } | null;
          };

          if (coursesResult.error) {
            throw new Error(coursesResult.error.message);
          }

          const courseIds = (coursesResult.data ?? []).map(
            (course) => course.id
          );

          if (courseIds.length === 0) {
            if (isMounted) setQuizzes([]);
            return;
          }

          quizQuery = quizQuery.in("course_id", courseIds);
        }

        if (userRole === "student") {
          const enrollmentsResult = (await supabase
            .from("enrollments")
            .select("course_id")
            .eq("student_id", session.user.id)) as {
            data: { course_id: string }[] | null;
            error: { message: string } | null;
          };

          if (enrollmentsResult.error) {
            throw new Error(enrollmentsResult.error.message);
          }

          const courseIds = (enrollmentsResult.data ?? []).map(
            (enrollment) => enrollment.course_id
          );

          if (courseIds.length === 0) {
            if (isMounted) setQuizzes([]);
            return;
          }

          quizQuery = quizQuery
            .eq("is_published", true)
            .in("course_id", courseIds);
        }

        const quizzesResult = (await quizQuery) as {
          data: Quiz[] | null;
          error: { message: string } | null;
        };

        if (quizzesResult.error) {
          throw new Error(quizzesResult.error.message);
        }

        const loadedQuizzes = quizzesResult.data ?? [];

        if (!isMounted) return;

        setQuizzes(loadedQuizzes);

        if (loadedQuizzes.length === 0) {
          setAttemptCounts({});
          return;
        }

        let attemptsQuery = supabase
          .from("quiz_attempts")
          .select("quiz_id")
          .in(
            "quiz_id",
            loadedQuizzes.map((quiz) => quiz.id)
          );

        if (userRole === "student") {
          attemptsQuery = attemptsQuery.eq("student_id", session.user.id);
        }

        const attemptsResult = (await attemptsQuery) as {
          data: QuizAttempt[] | null;
          error: { message: string } | null;
        };

        if (attemptsResult.error) {
          throw new Error(attemptsResult.error.message);
        }

        const counts: Record<string, number> = {};

        for (const attempt of attemptsResult.data ?? []) {
          counts[attempt.quiz_id] = (counts[attempt.quiz_id] ?? 0) + 1;
        }

        if (isMounted) setAttemptCounts(counts);
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Quizzes load karte waqt error aa gaya."
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadQuizzes();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ProtectedRoute allowedRole={["admin", "instructor", "student"]}>
      <PageShell
        title="Quizzes"
        description="Manage assessments, submissions, and results."
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Assessment Center
              </h2>

              <p className="text-sm text-slate-500">
                {role === "student"
                  ? "Published quizzes from your enrolled courses"
                  : "Published and draft quizzes"}
              </p>
            </div>
          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Loading quizzes...
            </p>
          ) : error ? (
            <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
              {error}
            </p>
          ) : quizzes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <p className="font-medium text-slate-700">No quizzes found.</p>
              <p className="mt-1 text-sm text-slate-500">
                Quizzes will appear here when they are available.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {quiz.title}
                    </p>

                    {quiz.description && (
                      <p className="mt-1 text-sm text-slate-500">
                        {quiz.description}
                      </p>
                    )}

                    <p className="mt-2 text-sm text-slate-500">
                      {attemptCounts[quiz.id] ?? 0}{" "}
                      {role === "student" ? "your attempts" : "total attempts"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
                        quiz.is_published
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {quiz.is_published ? "Published" : "Draft"}
                    </span>

                    {quiz.is_published && (
                      <button
                        type="button"
                        onClick={() => {
                          if (role === "student") {
                            router.push(`/quizzes/${quiz.id}`);
                          } else {
                            router.push(`/quizzes/${quiz.id}/preview`);
                          }
                        }}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                      >
                        {role === "student" ? "Start Quiz" : "View Quiz"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageShell>
    </ProtectedRoute>
  );
}