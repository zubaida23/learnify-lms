
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageShell from "../components/PageShell";
import { supabase } from "@/src/lib/supabase/client";

type Instructor = {
  id: string;
  full_name: string | null;
  email: string | null;
  status: string | null;
};

type Course = {
  id: string;
  title: string;
  instructor_id: string | null;
};

type InstructorWithCourses = Instructor & {
  courses: string[];
};

export default function TeachersPage() {
  const [instructors, setInstructors] = useState<InstructorWithCourses[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTeachers() {
      setLoading(true);
      setError("");

      try {
        const { data: instructorData, error: instructorError } =
          await supabase
            .from("profiles")
            .select("id, full_name, email, status")
            .eq("role", "instructor");

        if (instructorError) throw instructorError;

        const instructorList = (instructorData ?? []) as Instructor[];

        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("id, title, instructor_id");

        if (courseError) throw courseError;

        const courseList = (courseData ?? []) as Course[];

        const result = instructorList.map((instructor) => ({
          ...instructor,
          courses: courseList
            .filter((course) => course.instructor_id === instructor.id)
            .map((course) => course.title),
        }));

        setInstructors(result);
      } catch (err) {
        console.error("Teachers page error:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load instructors."
        );
      } finally {
        setLoading(false);
      }
    }

    loadTeachers();
  }, []);

  return (
    <PageShell
      title="Teachers"
      description="Manage instructors and course leadership."
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Instructor Team
            </h2>
            <p className="text-sm text-slate-500">
              Current teaching staff
            </p>
          </div>

          <Link
            href="/dashboard"
            className="text-sm font-medium text-emerald-600"
          >
            Dashboard
          </Link>
        </div>

        {loading ? (
          <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
            Loading instructors...
          </p>
        ) : error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        ) : instructors.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
            No instructors found.
          </p>
        ) : (
          <div className="space-y-3">
            {instructors.map((instructor) => (
              <div
                key={instructor.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {instructor.full_name || "Unnamed Instructor"}
                  </p>

                  

                  <div className="mt-2 space-y-1">
                    {instructor.courses.length > 0 ? (
                      instructor.courses.map((course) => (
                        <p
                          key={course}
                          className="text-sm text-slate-500"
                        >
                          {course}
                        </p>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400">
                        No courses assigned
                      </p>
                    )}
                  </div>
                </div>

                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    instructor.status === "active"
                      ? "bg-violet-100 text-violet-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {instructor.status || "Unknown"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
