
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import PageShell from "@/app/components/PageShell";
import { supabase } from "@/src/lib/supabase/client";

type Course = {
  id: string;
  title: string;
  description: string | null;
};

type Lesson = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  content: string | null;
  video_url: string | null;
  lesson_material_url: string | null;
  duration_minutes: number | null;
  order_index: number;
};

type LessonProgress = {
  lesson_id: string;
  status: string;
  progress_percent: number;
};

export default function LearnCoursePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadCourse = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profileError) throw profileError;

      const userRole = (
        profile as unknown as { role: string } | null
      )?.role;

      if (userRole !== "student") {
        router.replace("/dashboard");
        return;
      }

      const { data: enrollment, error: enrollmentError } = await supabase
        .from("enrollments")
        .select("id")
        .eq("student_id", session.user.id)
        .eq("course_id", courseId)
        .in("enrollment_status", ["active", "completed"])
        .maybeSingle();

      if (enrollmentError) throw enrollmentError;

      if (!enrollment) {
        setError("You are not enrolled in this course.");
        setCourse(null);
        setLessons([]);
        setProgress([]);
        return;
      }

      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("id, title, description")
        .eq("id", courseId)
        .single();

      if (courseError) throw courseError;

      const { data: lessonData, error: lessonError } = await supabase
        .from("lessons")
        .select(
          "id, course_id, title, description, content, video_url, lesson_material_url, duration_minutes, order_index"
        )
        .eq("course_id", courseId)
        .eq("is_published", true)
        .order("order_index", { ascending: true });

      if (lessonError) throw lessonError;

      const loadedLessons = (lessonData ?? []) as unknown as Lesson[];

      const { data: progressData, error: progressError } = await supabase
        .from("lesson_progress")
        .select("lesson_id, status, progress_percent")
        .eq("student_id", session.user.id);

      if (progressError) throw progressError;

      const loadedProgress = (
        progressData ?? []
      ) as unknown as LessonProgress[];

      setCourse(courseData as Course);
      setLessons(loadedLessons);
      setProgress(loadedProgress);

      setSelectedLesson((current) => {
        if (
          current &&
          loadedLessons.some((lesson) => lesson.id === current.id)
        ) {
          return loadedLessons.find(
            (lesson) => lesson.id === current.id
          ) ?? null;
        }

        return loadedLessons[0] ?? null;
      });
    } catch (err) {
      console.error("LEARNING PAGE ERROR:", err);
      setError(
        err instanceof Error ? err.message : "Unable to load course lessons."
      );
    } finally {
      setLoading(false);
    }
  }, [courseId, router]);

  useEffect(() => {
    if (courseId) {
      void loadCourse();
    }
  }, [courseId, loadCourse]);

  const completedCount = lessons.filter((lesson) =>
    progress.some(
      (item) =>
        item.lesson_id === lesson.id && item.status === "completed"
    )
  ).length;

  const percentage =
    lessons.length > 0
      ? Math.round((completedCount / lessons.length) * 100)
      : 0;

  async function handleCompleteLesson() {
    if (!selectedLesson || saving) return;

    try {
      setSaving(true);
      setError("");

      const { error: rpcError } = await supabase.rpc(
        "record_lesson_progress",
        {
          p_lesson_id: selectedLesson.id,
          p_status: "completed",
          p_progress_percent: 100,
        } as never
      );

      if (rpcError) throw rpcError;

      await loadCourse();
    } catch (err) {
      console.error("LESSON COMPLETION ERROR:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete this lesson."
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedCompleted = selectedLesson
    ? progress.some(
        (item) =>
          item.lesson_id === selectedLesson.id &&
          item.status === "completed"
      )
    : false;

  if (loading) {
    return (
      <PageShell
        title="Loading Course"
        description="Please wait while your course loads."
      >
        <div className="p-8 text-center">
          Loading your course...
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={course?.title ?? "Learning"}
      description={course?.description ?? "Learn your course lessons."}
    >
      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
        <Link
          href="/student/dashboard"
          className="text-sm font-medium text-emerald-600 hover:underline"
        >
          ← Back to Dashboard
        </Link>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {course && (
          <>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {course.title}
              </h1>

              {course.description && (
                <p className="mt-2 text-gray-600">
                  {course.description}
                </p>
              )}
            </div>

            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-semibold text-gray-900">
                  Course Progress
                </h2>

                <span className="font-bold text-emerald-600">
                  {percentage}%
                </span>
              </div>

              <div className="mt-3 h-3 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <p className="mt-2 text-sm text-gray-500">
                {completedCount} of {lessons.length} lessons completed
              </p>
            </section>

            <div className="grid gap-6 lg:grid-cols-3">
              <section className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="mb-4 font-semibold text-gray-900">
                  Course Lessons
                </h2>

                {lessons.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No published lessons available yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {lessons.map((lesson, index) => {
                      const isCompleted = progress.some(
                        (item) =>
                          item.lesson_id === lesson.id &&
                          item.status === "completed"
                      );

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => setSelectedLesson(lesson)}
                          className={`w-full rounded-lg border p-3 text-left transition ${
                            selectedLesson?.id === lesson.id
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-gray-800">
                              {index + 1}. {lesson.title}
                            </span>

                            {isCompleted && (
                              <span className="text-xs font-semibold text-emerald-600">
                                ✓ Completed
                              </span>
                            )}
                          </div>

                          {lesson.duration_minutes && (
                            <p className="mt-1 text-xs text-gray-500">
                              {lesson.duration_minutes} minutes
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-xl border bg-white p-5 shadow-sm lg:col-span-2">
                {selectedLesson ? (
                  <>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedLesson.title}
                    </h2>

                    {selectedLesson.description && (
                      <p className="mt-2 text-gray-600">
                        {selectedLesson.description}
                      </p>
                    )}

                    <div className="prose mt-6 max-w-none whitespace-pre-wrap text-gray-700">
                      {selectedLesson.content ||
                        "No lesson content provided."}
                    </div>

                    {selectedLesson.video_url && (
                      <div className="mt-6">
                        <h3 className="mb-2 font-semibold">
                          Lesson Video
                        </h3>

                        <a
                          href={selectedLesson.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:underline"
                        >
                          Watch Lesson Video ↗
                        </a>
                      </div>
                    )}

                    {selectedLesson.lesson_material_url && (
                      <div className="mt-4">
                        <a
                          href={selectedLesson.lesson_material_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:underline"
                        >
                          Open Learning Material ↗
                        </a>
                      </div>
                    )}

                    <div className="mt-8 border-t pt-5">
                      <button
                        onClick={handleCompleteLesson}
                        disabled={selectedCompleted || saving}
                        className="rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                      >
                        {saving
                          ? "Saving..."
                          : selectedCompleted
                            ? "✓ Lesson Completed"
                            : "Mark as Complete"}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500">
                    Select a lesson to start learning.
                  </p>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
