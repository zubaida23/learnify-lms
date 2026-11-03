
"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { FormEvent } from "react";
import PageShell from "@/app/components/PageShell";
import { supabase } from "@/src/lib/supabase/client";

type Lesson = {
  id: string;
  course_id: string;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  video_url: string | null;
  lesson_material_url: string | null;
  duration_minutes: number;
  order_index: number;
  is_published: boolean;
};

type LessonForm = {
  title: string;
  description: string;
  content: string;
  video_url: string;
  lesson_material_url: string;
  duration_minutes: string;
  order_index: string;
  is_published: boolean;
};

const emptyForm: LessonForm = {
  title: "",
  description: "",
  content: "",
  video_url: "",
  lesson_material_url: "",
  duration_minutes: "10",
  order_index: "1",
  is_published: true,
};

function getErrorMessage(err: unknown, fallback: string) {
  if (typeof err === "object" && err !== null && "message" in err) {
    return String(err.message);
  }

  return err instanceof Error ? err.message : fallback;
}

function ManageLessonsContent() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [courseTitle, setCourseTitle] = useState("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [form, setForm] = useState<LessonForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;

    let active = true;

    const loadPage = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/signin");
          return;
        }

        const profileResult = (await supabase
          .from("profiles" as never)
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle()) as {
          data: { role: string } | null;
          error: { message: string } | null;
        };

        if (profileResult.error || !profileResult.data) {
          throw new Error(
            profileResult.error?.message || "Unable to verify your account."
          );
        }

        const currentRole = profileResult.data.role;

        if (currentRole !== "admin" && currentRole !== "instructor") {
          router.replace("/courses");
          return;
        }

        const courseResult = (await supabase
          .from("courses" as never)
          .select("id, title, instructor_id")
          .eq("id", courseId)
          .maybeSingle()) as {
          data: {
            id: string;
            title: string;
            instructor_id: string;
          } | null;
          error: { message: string } | null;
        };

        if (courseResult.error) throw courseResult.error;

        if (!courseResult.data) {
          throw new Error("Course not found or you do not have access.");
        }

        if (
          currentRole === "instructor" &&
          courseResult.data.instructor_id !== session.user.id
        ) {
          throw new Error("You can only manage your assigned courses.");
        }

        const lessonResult = (await supabase
          .from("lessons" as never)
          .select("*")
          .eq("course_id", courseId)
          .order("order_index", { ascending: true })) as {
          data: Lesson[] | null;
          error: { message: string } | null;
        };

        if (lessonResult.error) throw lessonResult.error;

        if (active) {
          setCourseTitle(courseResult.data.title);
          setLessons(lessonResult.data ?? []);
        }
      } catch (err) {
        console.error("LESSON PAGE LOAD ERROR:", err);

        if (active) {
          setError(getErrorMessage(err, "Unable to load lessons."));
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPage();

    return () => {
      active = false;
    };
  }, [courseId, router]);

  const updateForm = (field: keyof LessonForm, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleEdit = (lesson: Lesson) => {
    setEditingId(lesson.id);
    setForm({
      title: lesson.title,
      description: lesson.description ?? "",
      content: lesson.content ?? "",
      video_url: lesson.video_url ?? "",
      lesson_material_url: lesson.lesson_material_url ?? "",
      duration_minutes: String(lesson.duration_minutes ?? 10),
      order_index: String(lesson.order_index ?? 1),
      is_published: lesson.is_published,
    });
    setNotice(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!form.title.trim()) {
      setError("Please enter a lesson title.");
      return;
    }

    const duration = Number(form.duration_minutes);
    const order = Number(form.order_index);

    if (!Number.isInteger(duration) || duration < 1) {
      setError("Duration must be at least 1 minute.");
      return;
    }

    if (!Number.isInteger(order) || order < 1) {
      setError("Lesson order must be at least 1.");
      return;
    }

    setSaving(true);

    const slug =
      form.title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      Date.now().toString(36);

    const payload = {
      course_id: courseId,
      title: form.title.trim(),
      slug,
      description: form.description.trim() || null,
      content: form.content.trim() || null,
      video_url: form.video_url.trim() || null,
      lesson_material_url: form.lesson_material_url.trim() || null,
      duration_minutes: duration,
      order_index: order,
      is_published: form.is_published,
    };

    try {
      if (editingId) {
        const { error: updateError } = (await supabase
          .from("lessons" as never)
          .update(payload as never)
          .eq("id", editingId)
          .eq("course_id", courseId)) as {
          error: { message: string } | null;
        };

        if (updateError) throw updateError;

        setNotice("Lesson updated successfully.");
      } else {
        const { error: insertError } = (await supabase
          .from("lessons" as never)
          .insert(payload as never)) as {
          error: { message: string } | null;
        };

        if (insertError) throw insertError;

        setNotice("Lesson added successfully.");
      }

      resetForm();

      const { data, error: refreshError } = (await supabase
        .from("lessons" as never)
        .select("*")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true })) as {
        data: Lesson[] | null;
        error: { message: string } | null;
      };

      if (refreshError) throw refreshError;
      setLessons(data ?? []);
    } catch (err) {
      console.error("LESSON SAVE ERROR:", err);
      setError(getErrorMessage(err, "Unable to save the lesson."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (lessonId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this lesson?"
    );

    if (!confirmed) return;

    setDeletingId(lessonId);
    setError(null);
    setNotice(null);

    try {
      const { error: deleteError } = (await supabase
        .from("lessons" as never)
        .delete()
        .eq("id", lessonId)
        .eq("course_id", courseId)) as {
        error: { message: string } | null;
      };

      if (deleteError) throw deleteError;

      setLessons((current) =>
        current.filter((lesson) => lesson.id !== lessonId)
      );

      setNotice("Lesson deleted successfully.");

      if (editingId === lessonId) resetForm();
    } catch (err) {
      console.error("LESSON DELETE ERROR:", err);
      setError(getErrorMessage(err, "Unable to delete the lesson."));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <PageShell title="Manage Lessons" description="Loading course...">
        <p className="rounded-xl bg-white p-5 text-sm text-slate-600">
          Please wait...
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Manage Lessons"
      description={courseTitle || "Manage course content"}
    >
      <div className="space-y-6">
        <Link
          href="/courses"
          className="inline-block text-sm font-medium text-emerald-700 hover:underline"
        >
          ← Back to Courses
        </Link>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {notice && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {notice}
          </div>
        )}

        <form
          onSubmit={handleSave}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {editingId ? "Edit Lesson" : "Add New Lesson"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Add lesson details and learning materials.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Lesson Title *
            </label>
            <input
              required
              value={form.title}
              onChange={(e) => updateForm("title", e.target.value)}
              placeholder="e.g. Introduction to HTML"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => updateForm("description", e.target.value)}
              placeholder="Short lesson description"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Lesson Content
            </label>
            <textarea
              rows={6}
              value={form.content}
              onChange={(e) => updateForm("content", e.target.value)}
              placeholder="Write lesson notes or learning content here..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Video URL
              </label>
              <input
                type="url"
                value={form.video_url}
                onChange={(e) => updateForm("video_url", e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Lesson Material URL
              </label>
              <input
                type="url"
                value={form.lesson_material_url}
                onChange={(e) =>
                  updateForm("lesson_material_url", e.target.value)
                }
                placeholder="https://..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                value={form.duration_minutes}
                onChange={(e) =>
                  updateForm("duration_minutes", e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Lesson Order
              </label>
              <input
                type="number"
                min="1"
                value={form.order_index}
                onChange={(e) => updateForm("order_index", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) =>
                updateForm("is_published", e.target.checked)
              }
              className="h-4 w-4 accent-emerald-600"
            />
            Publish this lesson
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Lesson"
                  : "Add Lesson"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Course Lessons
              </h2>
              <p className="text-sm text-slate-500">
                {lessons.length} lesson(s) in this course
              </p>
            </div>
          </div>

          {lessons.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">
              No lessons added yet. Use the form above to add your first lesson.
            </div>
          ) : (
            <div className="space-y-3">
              {lessons.map((lesson) => (
                <article
                  key={lesson.id}
                  className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">
                        {lesson.order_index}. {lesson.title}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          lesson.is_published
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {lesson.is_published ? "Published" : "Draft"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {lesson.description || "No description"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {lesson.duration_minutes} minutes
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(lesson)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(lesson.id)}
                      disabled={deletingId === lesson.id}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                    >
                      {deletingId === lesson.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}

export default function ManageLessonsPage() {
  return (
    <Suspense
      fallback={
        <PageShell title="Manage Lessons" description="Loading course...">
          <p className="rounded-xl bg-white p-5 text-sm text-slate-600">
            Please wait...
          </p>
        </PageShell>
      }
    >
      <ManageLessonsContent />
    </Suspense>
  );
}
