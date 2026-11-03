"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "../../components/PageShell";
import { supabase } from "@/src/lib/supabase/client";

type CourseStatus = "draft" | "published";
type CourseLevel = "beginner" | "intermediate" | "advanced";

const buildSlug = (title: string) => {
  const normalized = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "course";

  return `${normalized}-${Date.now()}`;
};

export default function NewCoursePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<CourseStatus>("draft");
  const [level, setLevel] = useState<CourseLevel>("beginner");
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAccess() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (!session) {
        router.replace("/signin");
        return;
      }

      const profileResult = (await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle()) as {
        data: { role?: string } | null;
        error: { message?: string } | null;
      };

      if (!isMounted) return;

      if (profileResult.error || !profileResult.data) {
        router.replace("/signin");
        return;
      }

      setIsAdmin(profileResult.data.role === "admin");
    }

    loadAccess();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      setError("Course title is required.");
      return;
    }

    if (!trimmedDescription) {
      setError("Description is required.");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setError("You must be signed in to create a course.");
      router.replace("/signin");
      return;
    }

    const profileResult = (await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle()) as {
      data: { role?: string } | null;
      error: { message?: string } | null;
    };

    if (profileResult.error || !profileResult.data || profileResult.data.role !== "admin") {
      setError("Admin access is required to create and publish courses.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        p_title: trimmedTitle,
        p_description: trimmedDescription,
        p_short_description: trimmedDescription.slice(0, 160),
        p_status: status,
        p_level: level,
        p_category: "General",
        p_price: 0,
      };

      const { data, error: insertError } = await supabase.rpc(
        "create_course_for_admin",
        payload as never
      );

      if (insertError) {
        const errorDetails = insertError as {
          code?: string;
          message?: string;
          details?: string;
          hint?: string;
        };

        console.error("Course creation failed:", {
          code: errorDetails.code,
          message: errorDetails.message,
          details: errorDetails.details,
          hint: errorDetails.hint,
        });

        throw insertError;
      }

      if (!data) {
        throw new Error("Course creation did not return a course id.");
      }

      setSuccess(
        status === "published"
          ? "Course published successfully."
          : "Course saved as draft successfully."
      );
      setTitle("");
      setDescription("");
      setStatus("draft");
      setLevel("beginner");
    } catch (insertError) {
      const supabaseError = insertError as {
        code?: string;
        message?: string;
        details?: string;
        hint?: string;
      };

      console.error("Course creation failed:", {
        code: supabaseError.code,
        message: supabaseError.message,
        details: supabaseError.details,
        hint: supabaseError.hint,
      });

      setError("Unable to save the course. Please verify your admin access and try again.");
    } finally {
      setSaving(false);
    }
  };

  if (isAdmin === null) {
    return (
      <PageShell title="Create Course" description="Checking access...">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-medium text-slate-700 shadow-sm">
          Checking admin access...
        </div>
      </PageShell>
    );
  }

  if (!isAdmin) {
    return (
      <PageShell title="Create Course" description="Admin access required.">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-red-700">Access denied</h2>
          <p className="mt-2 text-sm text-red-600">
            Only authenticated admins can create or publish courses.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Create Course"
      description="Add a new learning program to the platform."
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-900">New Course</h2>
          <Link href="/courses" className="text-sm font-medium text-emerald-600">
            Back to courses
          </Link>
        </div>

        <div className="space-y-4">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Course title</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-300 focus:bg-white"
              placeholder="Enter course title"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-28 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-300 focus:bg-white"
              placeholder="Brief description"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as CourseStatus)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-300 focus:bg-white"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Level</label>
              <select
                value={level}
                onChange={(event) => setLevel(event.target.value as CourseLevel)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-300 focus:bg-white"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link
              href="/courses"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-200 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "Saving..." : "Save Course"}
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
