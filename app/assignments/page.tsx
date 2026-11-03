"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "../auth/protected-route";
import PageShell from "../components/PageShell";
import { supabase } from "@/src/lib/supabase/client";

type TeacherCourse = {
  id: string;
  title: string;
};

type AssignmentRecord = {
  id: string;
  course_id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  due_date?: string | null;
  max_score: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  courses?: {
    id?: string;
    title?: string | null;
  } | null;
};

type AssignmentForm = {
  id?: string;
  course_id: string;
  title: string;
  description: string;
  instructions: string;
  due_date: string;
  max_score: number;
};

const emptyForm = (courseId = ""): AssignmentForm => ({
  course_id: courseId,
  title: "",
  description: "",
  instructions: "",
  due_date: "",
  max_score: 100,
});

const formatDate = (value?: string | null) => {
  if (!value) return "No due date";

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

const formatStatus = (isPublished: boolean) =>
  isPublished ? "Published" : "Draft";

export default function AssignmentsPage() {
  const [teacherCourses, setTeacherCourses] = useState<TeacherCourse[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isPublishingId, setIsPublishingId] = useState<string | null>(null);
  const [form, setForm] = useState<AssignmentForm>(emptyForm());
  const [showForm, setShowForm] = useState(false);

  const selectedCourseTitle = useMemo(() => {
    const match = teacherCourses.find((course) => course.id === form.course_id);
    return match?.title ?? "Select a course";
  }, [form.course_id, teacherCourses]);

  const loadAssignments = async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setTeacherCourses([]);
        setAssignments([]);
        setError("Your instructor session has expired. Please sign in again.");
        return;
      }

      const { data: profile, error: profileError }: any = await supabase
        .from("profiles" as never)
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      const role = String(profile?.role ?? "").toLowerCase();

      if (role !== "admin" && role !== "instructor") {
        setTeacherCourses([]);
        setAssignments([]);
        setError("You are not allowed to manage assignments.");
        return;
      }

      let coursesQuery: any = supabase
        .from("courses" as never)
        .select("id, title");

      if (role === "instructor") {
        coursesQuery = coursesQuery.eq("instructor_id", session.user.id);
      }

      const { data: courses, error: courseError } = await coursesQuery.order(
        "created_at",
        { ascending: false }
      );

      if (courseError) {
        throw courseError;
      }

      const nextCourses = courses ?? [];
      setTeacherCourses(nextCourses);

      if (nextCourses.length === 0) {
        setAssignments([]);
        return;
      }

      const courseIds = nextCourses.map((course: TeacherCourse) => course.id);

      const { data: assignmentRows, error: assignmentError }: any = await supabase
        .from("assignments" as never)
        .select(
          "id, course_id, title, description, instructions, due_date, max_score, is_published, created_at, updated_at, courses(id, title)"
        )
        .in("course_id", courseIds)
        .order("created_at", { ascending: false });

      if (assignmentError) {
        throw assignmentError;
      }

      setAssignments((assignmentRows ?? []) as AssignmentRecord[]);

      if (!form.id && !form.course_id && nextCourses[0]) {
        setForm((current) => ({
          ...current,
          course_id: nextCourses[0].id,
        }));
      }
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Unable to load assignments.";
      setError(message);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAssignments();
  }, []);

  const resetForm = () => {
    setForm({
      course_id: teacherCourses[0]?.id ?? "",
      title: "",
      description: "",
      instructions: "",
      due_date: "",
      max_score: 100,
    });
    setShowForm(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const trimmedTitle = form.title.trim();
    const trimmedDescription = form.description.trim();
    const trimmedInstructions = form.instructions.trim();
    const nextMaxScore = Number(form.max_score) > 0 ? Number(form.max_score) : 100;

    if (!form.course_id) {
      setError("Please choose a course before saving the assignment.");
      setIsSubmitting(false);
      return;
    }

    if (!trimmedTitle) {
      setError("Assignment title is required.");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      course_id: form.course_id,
      title: trimmedTitle,
      description: trimmedDescription || null,
      instructions: trimmedInstructions || null,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      max_score: nextMaxScore,
    };

    try {
      if (form.id) {
        const { error: updateError }: any = await supabase
          .from("assignments" as never)
          .update(payload as never)
          .eq("id", form.id);

        if (updateError) {
          throw updateError;
        }

        setSuccess("Assignment updated successfully.");
      } else {
        const { error: insertError }: any = await supabase
          .from("assignments" as never)
          .insert(payload as never);

        if (insertError) {
          throw insertError;
        }

        setSuccess("Assignment created successfully.");
      }

      await loadAssignments();
      resetForm();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unable to save the assignment.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (assignment: AssignmentRecord) => {
    setForm({
      id: assignment.id,
      course_id: assignment.course_id,
      title: assignment.title,
      description: assignment.description ?? "",
      instructions: assignment.instructions ?? "",
      due_date: assignment.due_date ? assignment.due_date.slice(0, 16) : "",
      max_score: assignment.max_score ?? 100,
    });
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleDelete = async (assignmentId: string) => {
    setIsDeletingId(assignmentId);
    setError(null);
    setSuccess(null);

    try {
      const { error: deleteError }: any = await supabase
        .from("assignments" as never)
        .delete()
        .eq("id", assignmentId);

      if (deleteError) {
        throw deleteError;
      }

      await loadAssignments();
      setSuccess("Assignment deleted successfully.");
      if (form.id === assignmentId) {
        resetForm();
      }
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : "Unable to delete the assignment.";
      setError(message);
    } finally {
      setIsDeletingId(null);
    }
  };

  const handlePublishToggle = async (assignment: AssignmentRecord) => {
    setIsPublishingId(assignment.id);
    setError(null);
    setSuccess(null);

    try {
      const { error: publishError }: any = await supabase
        .from("assignments" as never)
        .update({ is_published: !assignment.is_published } as never)
        .eq("id", assignment.id);

      if (publishError) {
        throw publishError;
      }

      await loadAssignments();
      setSuccess(
        assignment.is_published
          ? "Assignment unpublished successfully."
          : "Assignment published successfully."
      );
    } catch (publishError) {
      const message =
        publishError instanceof Error
          ? publishError.message
          : "Unable to update publication status.";
      setError(message);
    } finally {
      setIsPublishingId(null);
    }
  };

  return (
    <ProtectedRoute>
      <PageShell
        title="Assignments"
        description="Manage course assignments, publishing, and deadlines."
      >
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Assignment Queue</h2>
                <p className="text-sm text-slate-500">
                  {teacherCourses.length > 0
                    ? `${teacherCourses.length} course${teacherCourses.length === 1 ? "" : "s"} available`
                    : "No courses assigned yet"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForm(true);
                  setError(null);
                  setSuccess(null);
                  if (!form.id && teacherCourses[0] && !form.course_id) {
                    setForm((current) => ({ ...current, course_id: teacherCourses[0].id }));
                  }
                }}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-200 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={teacherCourses.length === 0}
              >
                New Assignment
              </button>
            </div>

            {error ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            ) : null}

            {loading ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                Loading assignments...
              </div>
            ) : assignments.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center">
                <h3 className="text-lg font-semibold text-slate-900">No assignments yet</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Create your first assignment for this course to start tracking submissions.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((assignment) => {
                  const courseTitle = assignment.courses?.title ?? selectedCourseTitle;

                  return (
                    <article
                      key={assignment.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">{assignment.title}</p>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                assignment.is_published
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {formatStatus(assignment.is_published)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">{courseTitle}</p>
                          <p className="mt-2 text-sm text-slate-600">
                            {assignment.description || "No description provided."}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                            <span>Due {formatDate(assignment.due_date)}</span>
                            <span>Max score {assignment.max_score}</span>
                            <span>Updated {formatDate(assignment.updated_at)}</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 md:items-end">
                          <button
                            type="button"
                            onClick={() => handlePublishToggle(assignment)}
                            disabled={isPublishingId === assignment.id}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isPublishingId === assignment.id
                              ? "Updating..."
                              : assignment.is_published
                              ? "Unpublish"
                              : "Publish"}
                          </button>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(assignment)}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(assignment.id)}
                              disabled={isDeletingId === assignment.id}
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isDeletingId === assignment.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {form.id ? "Edit Assignment" : "Create Assignment"}
                </h3>
                <p className="text-sm text-slate-500">{selectedCourseTitle}</p>
              </div>
              {form.id || showForm ? (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                  className="text-sm font-medium text-slate-600"
                >
                  Cancel
                </button>
              ) : null}
            </div>

            {!showForm && !form.id ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                <p className="text-sm text-slate-500">
                  Choose a course and create a new assignment.
                </p>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Course</label>
                  <select
                    value={form.course_id}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, course_id: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-0 transition focus:border-emerald-500"
                    disabled={teacherCourses.length === 0}
                  >
                    <option value="">Select a course</option>
                    {teacherCourses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
                  <input
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, title: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
                    placeholder="e.g. UX Audit Reflection"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, description: event.target.value }))
                    }
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
                    placeholder="Short assignment summary"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Instructions</label>
                  <textarea
                    value={form.instructions}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, instructions: event.target.value }))
                    }
                    rows={5}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
                    placeholder="Detailed assignment instructions"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Due date</label>
                    <input
                      type="datetime-local"
                      value={form.due_date}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, due_date: event.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Max score</label>
                    <input
                      type="number"
                      min={1}
                      value={form.max_score}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          max_score: Number(event.target.value) || 0,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || teacherCourses.length === 0}
                    className="inline-flex flex-1 items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-200 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting
                      ? form.id
                        ? "Saving..."
                        : "Creating..."
                      : form.id
                      ? "Save Changes"
                      : "Create Assignment"}
                  </button>
                  <Link
                    href="/teacher/dashboard"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    Dashboard
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </PageShell>
    </ProtectedRoute>
  );
}
