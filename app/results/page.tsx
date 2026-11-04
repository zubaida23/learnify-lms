
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "../components/PageShell";
import ProtectedRoute from "../auth/protected-route";
import { normalizeRole } from "@/src/lib/auth";
import { supabase } from "@/src/lib/supabase/client";

type Role = "admin" | "instructor" | "student";

type AttemptRow = {
  id: string;
  quiz_id: string;
  student_id: string;
  score: number | null;
  total_points: number | null;
  percentage: number | null;
  passed: boolean | null;
  status: string;
  submitted_at: string | null;
  created_at: string;
};

type QuizRow = {
  id: string;
  title: string;
};

type StudentRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type Result = AttemptRow & {
  quiz_title: string;
  student_name: string;
  student_email: string;
};

export default function ResultsPage() {
  const router = useRouter();

  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadResults() {
      try {
        setLoading(true);
        setError("");

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          throw new Error("Please sign in again.");
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileError || !profile) {
          throw new Error("User profile load nahi ho saki.");
        }

        const role = normalizeRole(profile.role) as Role;

        if (role === "student") {
          router.replace("/quizzes");
          return;
        }

        if (role !== "admin" && role !== "instructor") {
          throw new Error("You are not allowed to view results.");
        }

        let quizIds: string[] | null = null;

        // Instructor ke sirf apne courses
        if (role === "instructor") {
          const { data: courses, error: coursesError } = await supabase
            .from("courses")
            .select("id")
            .eq("instructor_id", session.user.id);

          if (coursesError) throw coursesError;

          const courseIds = (courses ?? []).map((course) => course.id);

          if (courseIds.length === 0) {
            if (active) setResults([]);
            return;
          }

          const { data: quizzes, error: quizzesError } = await supabase
            .from("quizzes")
            .select("id")
            .in("course_id", courseIds);

          if (quizzesError) throw quizzesError;

          quizIds = (quizzes ?? []).map((quiz) => quiz.id);

          if (quizIds.length === 0) {
            if (active) setResults([]);
            return;
          }
        }

        // Quiz attempts
        let attemptsQuery = supabase
          .from("quiz_attempts")
          .select(
            "id, quiz_id, student_id, score, total_points, percentage, passed, status, submitted_at, created_at"
          )
          .order("created_at", { ascending: false });

        if (quizIds !== null) {
          attemptsQuery = attemptsQuery.in("quiz_id", quizIds);
        }

        const attemptsResult = (await attemptsQuery) as {
          data: AttemptRow[] | null;
          error: { message: string } | null;
        };

        if (attemptsResult.error) {
          throw new Error(attemptsResult.error.message);
        }

        const attemptRows = attemptsResult.data ?? [];

        if (attemptRows.length === 0) {
          if (active) setResults([]);
          return;
        }

        const loadedQuizIds = [
          ...new Set(attemptRows.map((item) => item.quiz_id)),
        ];

        const studentIds = [
          ...new Set(attemptRows.map((item) => item.student_id)),
        ];

        // Quiz titles and student profiles
        const quizPromise = supabase
          .from("quizzes")
          .select("id, title")
          .in("id", loadedQuizIds);

        const studentPromise = supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", studentIds);

        const [quizResult, studentResult] = await Promise.all([
          quizPromise,
          studentPromise,
        ]);

        if (quizResult.error) throw quizResult.error;
        if (studentResult.error) throw studentResult.error;

        const quizRows = (quizResult.data ?? []) as QuizRow[];
        const studentRows = (studentResult.data ?? []) as StudentRow[];

        const quizMap = new Map(
          quizRows.map((quiz) => [quiz.id, quiz.title])
        );

        const studentMap = new Map(
          studentRows.map((student) => [
            student.id,
            {
              name: student.full_name || "Student",
              email: student.email || "",
            },
          ])
        );

        const formattedResults: Result[] = attemptRows.map((attempt) => {
          const student = studentMap.get(attempt.student_id);

          return {
            ...attempt,
            quiz_title: quizMap.get(attempt.quiz_id) || "Quiz",
            student_name: student?.name || "Student",
            student_email: student?.email || "",
          };
        });

        if (active) {
          setResults(formattedResults);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Results load karte waqt error aa gaya."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadResults();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <ProtectedRoute allowedRole={["admin", "instructor"]}>
      <PageShell
        title="Quiz Results"
        description="View student assessment results."
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            Student Results
          </h2>

          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Loading results...
            </p>
          ) : error ? (
            <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
              {error}
            </p>
          ) : results.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No quiz results available yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-3">Student</th>
                    <th className="p-3">Quiz</th>
                    <th className="p-3">Score</th>
                    <th className="p-3">Percentage</th>
                    <th className="p-3">Result</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>

                <tbody>
                  {results.map((result) => (
                    <tr
                      key={result.id}
                      className="border-t border-slate-100"
                    >
                      <td className="p-3">
                        <p className="font-medium text-slate-900">
                          {result.student_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {result.student_email}
                        </p>
                      </td>

                      <td className="p-3 text-slate-700">
                        {result.quiz_title}
                      </td>

                      <td className="p-3 text-slate-700">
                        {result.score ?? 0}/{result.total_points ?? 0}
                      </td>

                      <td className="p-3 text-slate-700">
                        {result.percentage ?? 0}%
                      </td>

                      <td className="p-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            result.passed
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {result.passed ? "Passed" : "Not Passed"}
                        </span>
                      </td>

                      <td className="p-3 text-slate-500">
                        {result.submitted_at
                          ? new Date(
                              result.submitted_at
                            ).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PageShell>
    </ProtectedRoute>
  );
}
