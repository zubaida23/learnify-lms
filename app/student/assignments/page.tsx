"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "../../auth/protected-route";
import PageShell from "../../components/PageShell";
import { supabase } from "@/src/lib/supabase/client";

type EnrollmentRow = {
  course_id: string;
};

type SubmissionRecord = {
  id: string;
  assignment_id: string;
  student_id: string;
  status: string;
  submission_text: string | null;
  file_url: string | null;
  feedback_text: string | null;
  grade: number | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type StudentAssignmentRecord = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  max_score: number;
  created_at: string;
  courses?: {
    id: string;
    title: string | null;
  } | null;
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return "No due date";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "No due date";
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<StudentAssignmentRecord[]>([]);
  const [submissionStatus, setSubmissionStatus] = useState<Record<string, SubmissionRecord>>({});
  const [submissionDrafts, setSubmissionDrafts] = useState<Record<string, string>>({});
  const [openSubmissionId, setOpenSubmissionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submissionMessage, setSubmissionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [submittingAssignmentId, setSubmittingAssignmentId] = useState<string | null>(null);

  const loadAssignments = async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setAssignments([]);
        setSubmissionStatus({});
        setError("Your session has expired. Please sign in again.");
        return;
      }

      const { data: enrollmentRows, error: enrollmentError } = (await supabase
        .from("enrollments" as never)
        .select("course_id")
        .eq("student_id", session.user.id)
        .in("enrollment_status", ["active", "completed"])) as {
        data: EnrollmentRow[] | null;
        error: { message?: string } | null;
      };

      if (enrollmentError) {
        throw enrollmentError;
      }

      const courseIds = [
        ...new Set((enrollmentRows ?? []).map((row) => row.course_id).filter(Boolean)),
      ];

      if (courseIds.length === 0) {
        setAssignments([]);
        setSubmissionStatus({});
        return;
      }

      const { data: assignmentRows, error: assignmentError } = (await supabase
        .from("assignments" as never)
        .select(
          "id, title, description, due_date, max_score, created_at, courses(id, title)"
        )
        .in("course_id", courseIds)
        .eq("is_published", true)) as {
        data: StudentAssignmentRecord[] | null;
        error: { message?: string } | null;
      };

      if (assignmentError) {
        throw assignmentError;
      }

      const sortedAssignments = [...(assignmentRows ?? [])].sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });

      const assignmentIds = sortedAssignments.map((assignment) => assignment.id);

      const { data: submissionRows, error: submissionError } = (await supabase
        .from("assignment_submissions" as never)
        .select(
          "id, assignment_id, student_id, status, submission_text, file_url, feedback_text, grade, submitted_at, reviewed_at, created_at, updated_at"
        )
        .eq("student_id", session.user.id)
        .in("assignment_id", assignmentIds)) as {
        data: SubmissionRecord[] | null;
        error: { message?: string } | null;
      };

      if (submissionError) {
        throw submissionError;
      }

      const nextSubmissionStatus: Record<string, SubmissionRecord> = {};
      for (const entry of submissionRows ?? []) {
        nextSubmissionStatus[entry.assignment_id] = entry;
      }

      setAssignments(sortedAssignments);
      setSubmissionStatus(nextSubmissionStatus);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Unable to load assignments.";
      setAssignments([]);
      setSubmissionStatus({});
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAssignment = async (assignmentId: string) => {
    const trimmedText = (submissionDrafts[assignmentId] ?? "").trim();

    if (!trimmedText) {
      setSubmissionMessage({
        type: "error",
        text: "Submission text cannot be empty.",
      });
      return;
    }

    setSubmittingAssignmentId(assignmentId);
    setSubmissionMessage(null);

    try {
      const { error } = await (supabase.rpc as any)("submit_assignment", {
        p_assignment_id: assignmentId,
        p_file_url: null,
        p_submission_text: trimmedText,
      });

      if (error) {
        throw error;
      }

      setOpenSubmissionId(null);
      setSubmissionDrafts((current) => ({
        ...current,
        [assignmentId]: "",
      }));
      setSubmissionMessage({
        type: "success",
        text: "Assignment submitted successfully.",
      });
      await loadAssignments();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unable to submit assignment.";
      setSubmissionMessage({
        type: "error",
        text: message,
      });
    } finally {
      setSubmittingAssignmentId(null);
    }
  };

  useEffect(() => {
    void loadAssignments();
  }, []);

  return (
    <ProtectedRoute allowedRole="student">
      <PageShell
        title="My Assignments"
        description="View published assignments for your active and completed courses."
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {submissionMessage ? (
            <div
              className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
                submissionMessage.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {submissionMessage.text}
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
              Loading your assignments...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : assignments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
              <h3 className="text-lg font-semibold text-slate-900">No published assignments yet</h3>
              <p className="mt-2 text-sm text-slate-500">
                Published assignments for your enrolled courses will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => {
                const submission = submissionStatus[assignment.id];
                const isFormOpen = openSubmissionId === assignment.id;

                return (
                  <article
                    key={assignment.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-slate-300 hover:bg-white"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                          {assignment.courses?.title ?? "Course"}
                        </p>
                        <h3 className="mt-2 text-xl font-semibold text-slate-900">
                          {assignment.title}
                        </h3>
                      </div>
                      <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                        Max score: {assignment.max_score}
                      </div>
                    </div>

                    {assignment.description ? (
                      <p className="mt-4 text-sm leading-6 text-slate-600">
                        {assignment.description}
                      </p>
                    ) : (
                      <p className="mt-4 text-sm italic text-slate-500">
                        No additional description provided.
                      </p>
                    )}

                    <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-600">
                      <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">
                        Due: {formatDate(assignment.due_date)}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">
                        Score: {assignment.max_score}
                      </span>
                    </div>

                    {submission ? (
                      <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <span className="font-semibold">Submission status: {submission.status}</span>
                          {submission.grade !== null ? (
                            <span>Grade: {submission.grade}</span>
                          ) : null}
                        </div>
                        {submission.submission_text ? (
                          <div className="mt-3 whitespace-pre-wrap rounded-lg bg-white p-3 text-slate-700">
                            {submission.submission_text}
                          </div>
                        ) : null}
                        {submission.feedback_text ? (
                          <div className="mt-3 whitespace-pre-wrap rounded-lg bg-white p-3 text-slate-700">
                            {submission.feedback_text}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {isFormOpen ? (
                      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Your assignment response
                        </label>
                        <textarea
                          value={submissionDrafts[assignment.id] ?? ""}
                          onChange={(event) =>
                            setSubmissionDrafts((current) => ({
                              ...current,
                              [assignment.id]: event.target.value,
                            }))
                          }
                          rows={6}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                          placeholder="Type your response here..."
                        />

                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => void handleSubmitAssignment(assignment.id)}
                            disabled={submittingAssignmentId === assignment.id}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                          >
                            {submittingAssignmentId === assignment.id
                              ? "Submitting..."
                              : "Submit Assignment"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenSubmissionId(null);
                              setSubmissionMessage(null);
                            }}
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-5 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenSubmissionId(assignment.id);
                            setSubmissionMessage(null);
                          }}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                        >
                          Submit Assignment
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </PageShell>
    </ProtectedRoute>
  );
}
