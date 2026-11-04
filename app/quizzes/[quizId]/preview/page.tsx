"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageShell from "../../../components/PageShell";
import ProtectedRoute from "../../../auth/protected-route";
import { normalizeRole } from "@/src/lib/auth";
import { supabase } from "@/src/lib/supabase/client";

type Quiz = {
  id: string;
  title: string;
  description: string | null;
  passing_score: number;
  attempts_allowed: number;
};

type Question = {
  id: string;
  question_text: string;
  question_type: string;
  options: { label: string; value: string }[] | null;
  points: number;
};

function QuizPreviewContent() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPreview() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          throw new Error("Please sign in again.");
        }

        const profile = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile.error || !profile.data) {
          throw new Error("User profile load nahi ho saki.");
        }

        const role = normalizeRole(profile.data.role);

        if (role !== "admin" && role !== "instructor") {
          router.replace("/quizzes");
          return;
        }

        const quizResult = await supabase
          .from("quizzes")
          .select("id, title, description, passing_score, attempts_allowed")
          .eq("id", quizId)
          .maybeSingle();

        if (quizResult.error || !quizResult.data) {
          throw new Error("Quiz nahi mila ya access available nahi hai.");
        }

        const questionsResult = await supabase
          .from("quiz_questions")
          .select("id, question_text, question_type, options, points")
          .eq("quiz_id", quizId)
          .order("created_at", { ascending: true });

        if (questionsResult.error) {
          throw new Error(questionsResult.error.message);
        }

        if (active) {
          setQuiz(quizResult.data as Quiz);
          setQuestions((questionsResult.data ?? []) as Question[]);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Quiz preview load nahi ho saka."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (quizId) loadPreview();

    return () => {
      active = false;
    };
  }, [quizId, router]);

  return (
    <ProtectedRoute allowedRole={["admin", "instructor"]}>
      <PageShell
        title="Quiz Preview"
        description="Review quiz details and questions."
      >
        <div className="mx-auto max-w-4xl space-y-6">
          <button
            onClick={() => router.push("/quizzes")}
            className="text-sm font-semibold text-emerald-700 hover:underline"
          >
            ← Back to Quizzes
          </button>

          {loading ? (
            <div className="rounded-xl bg-white p-8 text-center">
              Loading quiz preview...
            </div>
          ) : error ? (
            <div className="rounded-xl bg-red-50 p-5 text-sm text-red-700">
              {error}
            </div>
          ) : quiz ? (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-900">
                  {quiz.title}
                </h2>

                {quiz.description && (
                  <p className="mt-2 text-slate-500">
                    {quiz.description}
                  </p>
                )}

                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Questions</p>
                    <p className="text-xl font-bold">{questions.length}</p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Total Points</p>
                    <p className="text-xl font-bold">
                      {questions.reduce((sum, q) => sum + q.points, 0)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Passing Score</p>
                    <p className="text-xl font-bold">
                      {quiz.passing_score}%
                    </p>
                  </div>
                </div>
              </div>

              {questions.length === 0 ? (
                <div className="rounded-xl bg-white p-6 text-center text-slate-500">
                  No questions added yet.
                </div>
              ) : (
                questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex justify-between gap-3">
                      <h3 className="font-semibold text-slate-900">
                        {index + 1}. {question.question_text}
                      </h3>

                      <span className="shrink-0 text-xs text-slate-500">
                        {question.points} Point(s)
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {(question.options ?? []).map((option) => (
                        <div
                          key={option.value}
                          className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700"
                        >
                          {option.label}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </>
          ) : null}
        </div>
      </PageShell>
    </ProtectedRoute>
  );
}
export default function QuizPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Loading quiz preview...
        </div>
      }
    >
      <QuizPreviewContent />
    </Suspense>
  );
}