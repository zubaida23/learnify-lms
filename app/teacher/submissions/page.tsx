"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "../../auth/protected-route";
import PageShell from "../../components/PageShell";
import { supabase } from "@/src/lib/supabase/client";

type InstructorSubmissionRow = {
  id: string;
  assignment_id: string;
  assignment_title: string;
  course_title: string;
  student_id: string;
  student_name: string | null;
  student_email: string | null;
  submission_text: string | null;
  file_url: string | null;
  grade: number | null;
  feedback_text: string | null;
  status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  max_score: number;
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function TeacherSubmissionsPage() {
  const [submissions, setSubmissions] = useState<InstructorSubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [grading, setGrading] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadSubmissions = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setSubmissions([]);
        setError("Your instructor session has expired. Please sign in again.");
        return;
      }

      const { data: submissionRows, error: submissionError } = (await supabase
        .from("assignment_submissions" as never)
        .select(
          "id, assignment_id, student_id, submission_text, file_url, grade, feedback_text, status, submitted_at, reviewed_at, created_at, updated_at, assignments(id, title, max_score, course_id, courses(id, title, instructor_id)), profiles(id, full_name, email)"
        )) as {
        data: any[] | null;
        error: { message?: string } | null;
      };

      if (submissionError) {
        throw submissionError;
      }

      const filtered = (submissionRows ?? []).filter((row) => {
        const assignment = row.assignments;
        const course = assignment?.courses;
        return !!assignment && !!course && course.instructor_id === session.user.id;
      });

      const mapped = filtered.map((row) => {
        const assignment = row.assignments;
        const course = assignment?.courses;
        const student = row.profiles;

        return {
          id: row.id,
          assignment_id: row.assignment_id,
          assignment_title: assignment?.title ?? "Unknown assignment",
          course_title: course?.title ?? "Unknown course",
          student_id: row.student_id,
          student_name: student?.full_name ?? "Unknown student",
          student_email: student?.email ?? null,
          submission_text: row.submission_text,
          file_url: row.file_url,
          grade: row.grade,
          feedback_text: row.feedback_text,
          status: row.status,
          submitted_at: row.submitted_at ?? row.created_at,
          reviewed_at: row.reviewed_at,
          max_score: assignment?.max_score ?? 100,
        } satisfies InstructorSubmissionRow;
      });

      setSubmissions(mapped);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Unable to load submissions.";
      setError(message);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSubmissions();
  }, []);

  const handleGradeSubmit = async (submissionId: string) => {
    const rawGrade = grading[submissionId];
    const trimmedFeedback = (feedback[submissionId] ?? "").trim();
    const parsedGrade = Number(rawGrade);

    if (rawGrade === undefined || rawGrade === null || rawGrade === "") {
      setError("Please enter a grade before submitting.");
      return;
    }

    if (Number.isNaN(parsedGrade) || parsedGrade < 0) {
      setError("Grade must be a valid number greater than or equal to 0.");
      return;
    }

    const submission = submissions.find((item) => item.id === submissionId);
    if (!submission) {
      setError("Submission not found.");
      return;
    }

    if (parsedGrade > submission.max_score) {
      setError(`Grade must be between 0 and ${submission.max_score}.`);
      return;
    }

    setSubmittingId(submissionId);
    setError(null);
    setSuccessMessage(null);

    try {
      const { error } = await (supabase.rpc as any)("grade_assignment_submission", {
        p_submission_id: submissionId,
        p_grade: parsedGrade,
        p_feedback_text: trimmedFeedback || null,
      });

      if (error) {
        throw error;
      }

      setSuccessMessage("Submission graded successfully.");
      await loadSubmissions();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unable to grade submission.";
      setError(message);
    } finally {
      setSubmittingId(null);
    }
  };

  const hasSubmissions = submissions.length > 0;

  return (
    <ProtectedRoute allowedRole="instructor">
      <PageShell
        title="Assignment Submissions"
        description="Review and grade student submissions for your courses."
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {successMessage ? (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
              Loading submissions...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : !hasSubmissions ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
              <h3 className="text-lg font-semibold text-slate-900">No submissions yet</h3>
              <p className="mt-2 text-sm text-slate-500">
                Student submissions for your assignments will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {submissions.map((submission) => (
                <article
                  key={submission.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                        <span>{submission.course_title}</span>
                        <span className="text-slate-400">•</span>
                        <span>{submission.assignment_title}</span>
                      </div>

                      <h3 className="mt-3 text-lg font-semibold text-slate-900">
                        {submission.student_name ?? "Unknown student"}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {submission.student_email ?? "No email available"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">
                        {submission.status}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">
                        {submission.grade !== null ? `Grade: ${submission.grade}` : "Ungraded"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Submitted response
                      </p>
                      <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {submission.submission_text?.trim() || "No text submission provided."}
                      </div>
                      {submission.file_url ? (
                        <div className="mt-4">
                          <a
                            href={submission.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-emerald-600 underline"
                          >
                            Open submitted file
                          </a>
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Review
                      </p>

                      <div className="mt-3 text-sm text-slate-600">
                        <p>Submitted: {formatDate(submission.submitted_at)}</p>
                        <p className="mt-1">Max score: {submission.max_score}</p>
                      </div>

                      <div className="mt-4 space-y-3">
                        <label className="block text-sm font-medium text-slate-700">
                          Grade
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={submission.max_score}
                          value={grading[submission.id] ?? submission.grade ?? ""}
                          onChange={(event) =>
                            setGrading((current) => ({
                              ...current,
                              [submission.id]: event.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                          placeholder={`0 - ${submission.max_score}`}
                        />

                        <label className="block text-sm font-medium text-slate-700">
                          Feedback
                        </label>
                        <textarea
                          rows={3}
                          value={feedback[submission.id] ?? submission.feedback_text ?? ""}
                          onChange={(event) =>
                            setFeedback((current) => ({
                              ...current,
                              [submission.id]: event.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                          placeholder="Optional feedback to the student"
                        />

                        <button
                          type="button"
                          onClick={() => void handleGradeSubmit(submission.id)}
                          disabled={submittingId === submission.id}
                          className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                        >
                          {submittingId === submission.id ? "Submitting..." : "Save grade"}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </PageShell>
    </ProtectedRoute>
  );
}
