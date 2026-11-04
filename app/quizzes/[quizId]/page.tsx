
"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageShell from "../../components/PageShell";
import ProtectedRoute from "../../auth/protected-route";
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

type QuizResult = {
  attempt_id: string;
  score: number;
  total_points: number;
  percentage: number;
  passed: boolean;
  status: string;
};

function QuizAttemptPageContent() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadQuiz() {
      try {
        setLoading(true);
        setError("");

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          throw new Error("Session nahi mili. Dobara sign in karein.");
        }

        const profileResult = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileResult.error || !profileResult.data) {
          throw new Error("User profile load nahi ho saki.");
        }

        if (profileResult.data.role !== "student") {
          throw new Error("Ye quiz attempt page sirf students ke liye hai.");
        }

        const quizResult = await supabase
          .from("quizzes")
          .select("id, title, description, passing_score, attempts_allowed")
          .eq("id", quizId)
          .eq("is_published", true)
          .single();

        if (quizResult.error || !quizResult.data) {
          throw new Error("Quiz nahi mila ya abhi publish nahi hua.");
        }

        const questionsResult = await supabase
          .from("quiz_questions")
          .select("id, question_text, question_type, options, points")
          .eq("quiz_id", quizId)
          .order("created_at", { ascending: true });

        if (questionsResult.error) {
          throw new Error(questionsResult.error.message);
        }

        if (!questionsResult.data || questionsResult.data.length === 0) {
          throw new Error("Is quiz mein abhi questions available nahi hain.");
        }

        const unsupportedQuestion = questionsResult.data.find(
          (question) => question.question_type !== "multiple_choice"
        );

        if (unsupportedQuestion) {
          throw new Error(
            "Filhal ye quiz sirf Multiple Choice questions support karta hai."
          );
        }

        if (isMounted) {
          setQuiz(quizResult.data as Quiz);
          setQuestions(questionsResult.data as Question[]);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Quiz load karte waqt error aa gaya."
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (quizId) loadQuiz();

    return () => {
      isMounted = false;
    };
  }, [quizId]);

  function handleAnswer(questionId: string, value: string) {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: value,
    }));
  }

  async function handleSubmit() {
    if (!quiz || submitting || result) return;

    const unanswered = questions.filter(
      (question) => !answers[question.id]
    );

    if (unanswered.length > 0) {
      setError(
        `Please answer all questions. ${unanswered.length} question(s) remaining.`
      );
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to submit your quiz?"
    );

    if (!confirmed) return;

    try {
      setSubmitting(true);
      setError("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("Session expire ho gayi. Dobara sign in karein.");
      }

      const { data, error: submitError } = await supabase.rpc(
        "submit_quiz_attempt",
        {
          p_quiz_id: quiz.id,
          p_answers: answers,
        }
      );

      if (submitError) {
        throw new Error(submitError.message);
      }

      const quizResult = data as QuizResult;

      if (
        !quizResult ||
        !quizResult.attempt_id ||
        typeof quizResult.percentage !== "number"
      ) {
        throw new Error("Quiz result ka response valid nahi hai.");
      }

      setResult(quizResult);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Quiz submit karte waqt error aa gaya."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ProtectedRoute allowedRole="student">
      <PageShell
        title="Take Quiz"
        description="Read each question carefully and submit your answers."
      >
        <div className="mx-auto max-w-4xl space-y-6">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              Loading quiz...
            </div>
          ) : error && !quiz ? (
            <div className="rounded-2xl bg-red-50 p-5 text-sm text-red-700">
              {error}
              <button
                onClick={() => router.push("/quizzes")}
                className="mt-4 block font-semibold underline"
              >
                Back to Quizzes
              </button>
            </div>
          ) : result ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <div
                className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-2xl ${
                  result.passed
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {result.passed ? "✓" : "×"}
              </div>

              <h2 className="text-2xl font-bold text-slate-900">
                {result.passed ? "Quiz Passed!" : "Quiz Not Passed"}
              </h2>

              <p className="mt-2 text-slate-500">
                Your quiz has been submitted successfully.
              </p>

              <div className="my-7 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Score</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {result.score}/{result.total_points}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Percentage</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {result.percentage}%
                  </p>
                </div>

                <div className="col-span-2 rounded-xl bg-slate-50 p-4 sm:col-span-1">
                  <p className="text-sm text-slate-500">Passing Score</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {quiz?.passing_score}%
                  </p>
                </div>
              </div>

              <button
                onClick={() => router.push("/quizzes")}
                className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700"
              >
                Back to Quizzes
              </button>
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

                <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                  <span>{questions.length} Questions</span>
                  <span>
                    {questions.reduce((sum, q) => sum + q.points, 0)} Total
                    Points
                  </span>
                  <span>Passing: {quiz.passing_score}%</span>
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-slate-900">
                      {index + 1}. {question.question_text}
                    </h3>

                    <span className="shrink-0 text-xs text-slate-500">
                      {question.points} Point(s)
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    {(question.options ?? []).map((option) => (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                          answers[question.id] === option.value
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-slate-200 hover:border-emerald-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value={option.value}
                          checked={answers[question.id] === option.value}
                          onChange={() =>
                            handleAnswer(question.id, option.value)
                          }
                          className="h-4 w-4 accent-emerald-600"
                        />

                        <span className="text-sm text-slate-700">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="mb-4 text-sm text-slate-500">
                  Answered {Object.keys(answers).length} of {questions.length}{" "}
                  questions.
                </p>

                <button
                  onClick={handleSubmit}
                  disabled={
                    submitting ||
                    Object.keys(answers).length !== questions.length
                  }
                  className="w-full rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Quiz"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </PageShell>
    </ProtectedRoute>
  );
}
export default function QuizAttemptPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-center">
          Loading quiz...
        </div>
      }
    >
      <QuizAttemptPageContent />
    </Suspense>
  );
}