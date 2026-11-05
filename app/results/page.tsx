
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

type Result = AttemptRow & {
  quiz_title: string;
  student_name: string;
  student_email: string;
  attempt_number: number;
};

export default function ResultsPage() {
  const router = useRouter();

  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

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

        let attemptsQuery = supabase
          .from("quiz_attempts")
          .select(
            "id, quiz_id, student_id, score, total_points, percentage, passed, status, submitted_at, created_at"
          )
          .order("created_at", { ascending: true });

        if (quizIds !== null) {
          attemptsQuery = attemptsQuery.in("quiz_id", quizIds);
        }

        const { data: attempts, error: attemptsError } =
          await attemptsQuery;

        if (attemptsError) throw attemptsError;

        const attemptRows = (attempts ?? []) as AttemptRow[];

        if (attemptRows.length === 0) {
          if (active) setResults([]);
          return;
        }

        const quizIdsToLoad = [
          ...new Set(attemptRows.map((item) => item.quiz_id)),
        ];

        const studentIds = [
          ...new Set(attemptRows.map((item) => item.student_id)),
        ];

        const [quizResult, studentResult] = await Promise.all([
          supabase
            .from("quizzes")
            .select("id, title")
            .in("id", quizIdsToLoad),

          supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", studentIds),
        ]);

        if (quizResult.error) throw quizResult.error;
        if (studentResult.error) throw studentResult.error;

        const quizMap = new Map(
          (quizResult.data ?? []).map((quiz) => [
            quiz.id,
            quiz.title,
          ])
        );

        const studentMap = new Map(
          (studentResult.data ?? []).map((student) => [
            student.id,
            {
              name: student.full_name || "Student",
              email: student.email || "",
            },
          ])
        );

        // Calculate attempt number for each student and quiz.
        const attemptNumbers = new Map<string, number>();
        const formattedResults: Result[] = [];

        for (const attempt of attemptRows) {
          const key = `${attempt.student_id}-${attempt.quiz_id}`;
          const number = (attemptNumbers.get(key) ?? 0) + 1;

          attemptNumbers.set(key, number);

          const student = studentMap.get(attempt.student_id);

          formattedResults.push({
            ...attempt,
            attempt_number: number,
            quiz_title: quizMap.get(attempt.quiz_id) || "Quiz",
            student_name: student?.name || "Student",
            student_email: student?.email || "",
          });
        }

        // Latest attempts first.
        formattedResults.reverse();

        if (active) setResults(formattedResults);
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

  const studentsCount = new Set(
    results.map((result) => result.student_id)
  ).size;

  const passedCount = results.filter(
    (result) => result.passed === true
  ).length;

  const failedCount = results.filter(
    (result) => result.passed === false
  ).length;

  const filteredResults = results.filter((result) => {
    const matchesSearch = [
      result.student_name,
      result.student_email,
      result.quiz_title,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesFilter =
      filter === "all" ||
      (filter === "passed" && result.passed === true) ||
      (filter === "failed" && result.passed === false);

    return matchesSearch && matchesFilter;
  });

  return (
    <ProtectedRoute allowedRole={["admin", "instructor"]}>
      <PageShell
        title="Quiz Results"
        description="Monitor student performance and quiz attempts."
      >
        <div className="space-y-6">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
              Loading results...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              {error}
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Total Attempts",
                    value: results.length,
                    icon: "📝",
                  },
                  {
                    label: "Students Attempted",
                    value: studentsCount,
                    icon: "👨‍🎓",
                  },
                  {
                    label: "Passed Attempts",
                    value: passedCount,
                    icon: "✅",
                  },
                  {
                    label: "Failed Attempts",
                    value: failedCount,
                    icon: "📊",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-500">
                        {item.label}
                      </p>
                      <span className="text-2xl">{item.icon}</span>
                    </div>
                    <p className="mt-3 text-3xl font-bold text-slate-900">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5">
                  <h2 className="text-xl font-bold text-slate-900">
                    Student Attempts
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Every quiz submission is displayed separately.
                  </p>
                </div>

                <div className="mb-5 flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search student or quiz..."
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />

                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                  >
                    <option value="all">All Results</option>
                    <option value="passed">Passed</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                {filteredResults.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
                    <p className="font-semibold text-slate-700">
                      No matching results found.
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Student attempts will appear here after submission.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[950px] text-left text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="rounded-l-lg p-3">Student</th>
                          <th className="p-3">Quiz</th>
                          <th className="p-3">Attempt</th>
                          <th className="p-3">Score</th>
                          <th className="p-3">Percentage</th>
                          <th className="p-3">Result</th>
                          <th className="rounded-r-lg p-3">Date</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredResults.map((result) => (
                          <tr
                            key={result.id}
                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                          >
                            <td className="p-3">
                              <p className="font-semibold text-slate-900">
                                {result.student_name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {result.student_email || "Email unavailable"}
                              </p>
                            </td>

                            <td className="p-3 text-slate-700">
                              {result.quiz_title}
                            </td>

                            <td className="p-3">
                              <span className="rounded-lg bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                                Attempt {result.attempt_number}
                              </span>
                            </td>

                            <td className="p-3 font-semibold text-slate-800">
                              {result.score ?? 0}/
                              {result.total_points ?? 0}
                            </td>

                            <td className="p-3 font-semibold text-slate-800">
                              {result.percentage ?? 0}%
                            </td>

                            <td className="p-3">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  result.passed === true
                                    ? "bg-emerald-100 text-emerald-700"
                                    : result.passed === false
                                      ? "bg-red-100 text-red-700"
                                      : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {result.passed === true
                                  ? "Passed"
                                  : result.passed === false
                                    ? "Failed"
                                    : "Pending"}
                              </span>
                            </td>

                            <td className="p-3 text-slate-500">
                              {result.submitted_at
                                ? new Date(
                                    result.submitted_at
                                  ).toLocaleString()
                                : "Not submitted"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <p className="mt-4 text-xs text-slate-400">
                  Showing {filteredResults.length} of {results.length} attempts.
                </p>
              </div>
            </>
          )}
        </div>
      </PageShell>
    </ProtectedRoute>
  );
}
