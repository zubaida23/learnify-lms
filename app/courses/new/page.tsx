
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "../../components/PageShell";
import { supabase } from "@/src/lib/supabase/client";
import { normalizeRole } from "@/src/lib/auth";

type UserRole = "admin" | "instructor" | "student";

type CourseRecord = {
  id: string;
  title: string;
  description?: string | null;
  short_description?: string | null;
  thumbnail_url?: string | null;
  status?: string;
  is_published?: boolean;
  created_at?: string;
  slug?: string;
  level?: string | null;
  price?: number | string | null;
  category?: string | null;
  instructor_id?: string;
};

type StudentCourse = CourseRecord & {
  enrolled: boolean;
};

type StaffCourse = CourseRecord & {
  enrollmentCount: number;
};

const formatCourseStatus = (status?: string) => {
  if (!status) return "Draft";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const formatCoursePrice = (price?: number | string | null) => {
  const numericPrice = typeof price === "string" ? Number(price) : price;

  if (
    typeof numericPrice !== "number" ||
    Number.isNaN(numericPrice) ||
    numericPrice <= 0
  ) {
    return "Free";
  }

  return `$${numericPrice.toFixed(2)}`;
};

const StaffCourseCatalog = ({
  courses,
  loading,
  error,
  role,
}: {
  courses: StaffCourse[];
  loading: boolean;
  error: string | null;
  role: UserRole;
}) => (
  <PageShell
    title="Courses"
    description={
      role === "admin"
        ? "Manage all learning programs and course lessons."
        : "Manage lessons in your assigned courses."
    }
  >
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {role === "admin" ? "All Courses" : "My Assigned Courses"}
          </h2>
          <p className="text-sm text-slate-500">
            {role === "admin"
              ? "Manage courses and their lessons."
              : "Only courses assigned to you appear here."}
          </p>
        </div>

        {role === "admin" && (
          <Link
            href="/courses/new"
            className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            Add New Course
          </Link>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">
          Loading courses...
        </p>
      ) : courses.length === 0 ? (
        <div className="rounded-xl bg-slate-50 p-8 text-center">
          <h3 className="font-semibold text-slate-900">No courses found</h3>
          <p className="mt-2 text-sm text-slate-500">
            {role === "instructor"
              ? "No courses have been assigned to you yet."
              : "Create a course to get started."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <div
              key={course.id}
              className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center"
            >
              <div>
                <h3 className="font-semibold text-slate-900">
                  {course.title}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {formatCourseStatus(course.status)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {course.level || "Beginner"} • {course.category || "General"} •{" "}
                  {formatCoursePrice(course.price)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {course.enrollmentCount} enrolled students
                </p>
              </div>

              <Link
                href={`/courses/${course.id}/lessons`}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
              >
                Manage Lessons
              </Link>
            </div>
          ))}
        </div>
      )}

      <Link
        href="/dashboard"
        className="mt-6 inline-block text-sm font-medium text-emerald-700 hover:underline"
      >
        ← Back to Dashboard
      </Link>
    </div>
  </PageShell>
);

export default function CoursesPage() {
  const router = useRouter();

  const [role, setRole] = useState<UserRole | null>(null);
  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [staffCourses, setStaffCourses] = useState<StaffCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadCourses = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (!session) {
          router.replace("/signin");
          return;
        }

        const profileResult = (await supabase
          .from("profiles" as never)
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle()) as {
          data: { role?: string } | null;
          error: { message?: string } | null;
        };

        if (profileResult.error || !profileResult.data) {
          throw new Error("Unable to verify your account role.");
        }

        const currentRole = normalizeRole(profileResult.data.role ?? "student");

        if (!isMounted) return;
        setRole(currentRole);

        if (currentRole === "admin" || currentRole === "instructor") {
          let query = supabase
            .from("courses" as never)
            .select(
              "id, title, status, level, price, category, created_at, instructor_id"
            )
            .order("created_at", { ascending: false });

          if (currentRole === "instructor") {
            query = query.eq("instructor_id", session.user.id) as typeof query;
          }

          const { data: courseRows, error: courseError } = (await query) as {
            data: CourseRecord[] | null;
            error: { message?: string } | null;
          };

          if (courseError) throw courseError;

          const enrollmentCounts: Record<string, number> = {};

          const { data: enrollmentRows } = (await supabase
            .from("enrollments" as never)
            .select("course_id")) as {
            data: { course_id: string }[] | null;
          };

          (enrollmentRows ?? []).forEach((row) => {
            enrollmentCounts[row.course_id] =
              (enrollmentCounts[row.course_id] ?? 0) + 1;
          });

          const result: StaffCourse[] = (courseRows ?? []).map((course) => ({
            ...course,
            enrollmentCount: enrollmentCounts[course.id] ?? 0,
          }));

          if (isMounted) setStaffCourses(result);
          return;
        }

        const { data: publishedCourses, error: fetchError } = (await supabase
          .from("courses" as never)
          .select(
            "id, title, description, short_description, thumbnail_url, status, is_published, created_at, slug"
          )
          .eq("status", "published")
          .eq("is_published", true)
          .order("created_at", { ascending: false })) as {
          data: CourseRecord[] | null;
          error: { message?: string } | null;
        };

        if (fetchError) throw fetchError;

        const { data: enrollmentRows, error: enrollmentError } = (await supabase
          .from("enrollments" as never)
          .select("course_id")
          .eq("student_id", session.user.id)) as {
          data: { course_id: string }[] | null;
          error: { message?: string } | null;
        };

        if (enrollmentError) throw enrollmentError;

        const enrolledIds = new Set(
          (enrollmentRows ?? []).map((item) => item.course_id)
        );

        const result: StudentCourse[] = (publishedCourses ?? []).map(
          (course) => ({
            ...course,
            enrolled: enrolledIds.has(course.id),
          })
        );

        if (isMounted) setCourses(result);
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Unable to load courses.";

        if (isMounted) setError(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadCourses();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleEnroll = async (courseId: string) => {
    setActionLoadingId(courseId);
    setNotice(null);

    try {
      const { error: enrollError } = (await supabase.rpc(
        "create_enrollment_for_student",
        { p_course_id: courseId } as never
      )) as {
        error: { message?: string } | null;
      };

      if (enrollError) throw enrollError;

      setCourses((current) =>
        current.map((course) =>
          course.id === courseId ? { ...course, enrolled: true } : course
        )
      );

      setNotice("Enrollment successful. You can start learning now!");
    } catch (enrollError) {
      setNotice(
        enrollError instanceof Error
          ? enrollError.message
          : "Unable to enroll in this course."
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading || role === null) {
    return (
      <PageShell title="Courses" description="Loading your courses...">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Please wait...
        </div>
      </PageShell>
    );
  }

  if (role === "admin" || role === "instructor") {
    return (
      <StaffCourseCatalog
        courses={staffCourses}
        loading={false}
        error={error}
        role={role}
      />
    );
  }

  return (
    <PageShell
      title="Courses"
      description="Explore published learning opportunities."
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {notice && (
          <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
            {notice}
          </div>
        )}

        {courses.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h3 className="font-semibold text-slate-900">
              No published courses available
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              New learning programs will appear here when published.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <article
                key={course.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="h-44 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-44 items-center justify-center bg-gradient-to-br from-emerald-100 to-slate-100 text-sm font-semibold uppercase tracking-widest text-slate-500">
                    Course
                  </div>
                )}

                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {course.title}
                    </h3>
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase text-emerald-700">
                      Published
                    </span>
                  </div>

                  <p className="mb-5 flex-1 text-sm leading-6 text-slate-600">
                    {course.description ||
                      course.short_description ||
                      "No description available."}
                  </p>

                  {course.enrolled ? (
                    <Link
                      href={`/learn/${course.id}`}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
                    >
                      Continue Learning
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleEnroll(course.id)}
                      disabled={Boolean(actionLoadingId)}
                      className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                    >
                      {actionLoadingId === course.id
                        ? "Enrolling..."
                        : "Enroll Now"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
