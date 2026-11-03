
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "../components/PageShell";
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
  instructor_id?: string | null;
};

type StudentCourse = CourseRecord & {
  enrolled?: boolean;
};

type AdminCourse = CourseRecord & {
  enrollmentCount: number;
};

const formatCourseStatus = (status?: string) => {
  if (!status) return "Draft";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const formatCourseDate = (value?: string) => {
  if (!value) return "Recently";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return "Recently";

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

const AdminCourseCatalog = ({
  courses,
  loading,
  error,
  role,
}: {
  courses: AdminCourse[];
  loading: boolean;
  error: string | null;
  role: UserRole;
}) => (
  <PageShell
    title="Courses"
    description="Manage learning programs and course catalogs."
  >
    <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Course Catalog
            </h2>
            <p className="text-sm text-slate-500">
              Latest published and draft offerings
            </p>
          </div>

          {role === "admin" && (
            <Link
              href="/courses/new"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-200 transition hover:bg-emerald-600"
            >
              Add New Course
            </Link>
          )}
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
            Loading courses...
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <h3 className="text-lg font-semibold text-slate-900">
              No courses available
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              New course records will appear here once they are added.
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
                  <p className="font-semibold text-slate-900">
                    {course.title}
                  </p>

                  <p className="text-sm text-slate-500">
                    {formatCourseStatus(course.status)}
                  </p>

                  <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-slate-400">
                    {course.level || "beginner"} •{" "}
                    {course.category || "General"} •{" "}
                    {formatCoursePrice(course.price)} •{" "}
                    {formatCourseDate(course.created_at)}
                  </p>

                  <span className="mt-2 inline-block rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    {course.enrollmentCount} students
                  </span>
                </div>

                <Link
                  href={`/courses/${course.id}/lessons`}
                  className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
                >
                  Manage Lessons
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">
          Quick Actions
        </h3>

        <div className="mt-4 space-y-3">
          {role === "admin" && (
            <Link
              href="/courses/new"
              className="block rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Create new course
            </Link>
          )}

          <Link
            href="/dashboard"
            className="block rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  </PageShell>
);

export default function CoursesPage() {
  const router = useRouter();

  const [role, setRole] = useState<UserRole | null>(null);
  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [adminCourses, setAdminCourses] = useState<AdminCourse[]>([]);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminError, setAdminError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadCourses = async () => {
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
        data: { role?: UserRole } | null;
        error: { code?: string; message?: string } | null;
      };

      if (!isMounted) return;

      if (profileResult.error && profileResult.error.code !== "PGRST116") {
        router.replace("/signin");
        return;
      }

      const nextRole = normalizeRole(
        profileResult.data?.role ?? "student"
      ) as UserRole;

      setRole(nextRole);

      if (nextRole !== "student") {
        try {
          setAdminLoading(true);
          setAdminError(null);

          let courseQuery = supabase
            .from("courses" as never)
            .select(
              "id, title, status, level, price, category, created_at, instructor_id"
            );

          if (nextRole === "instructor") {
            courseQuery = courseQuery.eq(
              "instructor_id",
              session.user.id
            ) as typeof courseQuery;
          }

          const { data: courseRows, error: courseError } = (await courseQuery
            .order("created_at", { ascending: false })) as {
            data: CourseRecord[] | null;
            error: { message?: string } | null;
          };

          if (courseError) throw courseError;

          const enrollmentCounts: Record<string, number> = {};

          const { data: enrollmentRows, error: enrollmentError } =
            (await supabase
              .from("enrollments" as never)
              .select("course_id")) as {
              data: { course_id: string }[] | null;
              error: { message?: string } | null;
            };

          if (!enrollmentError && enrollmentRows) {
            enrollmentRows.forEach((row) => {
              if (!row.course_id) return;

              enrollmentCounts[row.course_id] =
                (enrollmentCounts[row.course_id] ?? 0) + 1;
            });
          }

          const builtCourses: AdminCourse[] = (courseRows ?? []).map(
            (course) => ({
              ...course,
              enrollmentCount: enrollmentCounts[course.id] ?? 0,
            })
          );

          if (isMounted) {
            setAdminCourses(builtCourses);
          }
        } catch (loadError) {
          const message =
            loadError instanceof Error
              ? loadError.message
              : "Unable to load courses.";

          if (isMounted) {
            setAdminError(message);
            setAdminCourses([]);
          }
        } finally {
          if (isMounted) {
            setAdminLoading(false);
          }
        }

        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data: publishedCourses, error: fetchError } =
          (await supabase
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

        let userEnrollments: { course_id: string }[] = [];

        const { data: enrollmentRows, error: enrollmentError } =
          (await supabase
            .from("enrollments" as never)
            .select("course_id")
            .eq("student_id", session.user.id)) as {
            data: { course_id: string }[] | null;
            error: { message?: string } | null;
          };

        if (!enrollmentError && enrollmentRows) {
          userEnrollments = enrollmentRows;
        }

        const enrolledCourseIds = new Set(
          userEnrollments.map((enrollment) => enrollment.course_id)
        );

        const builtCourses: StudentCourse[] = (
          publishedCourses ?? []
        ).map((course) => ({
          ...course,
          enrolled: enrolledCourseIds.has(course.id),
        }));

        if (isMounted) {
          setCourses(builtCourses);
        }
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Unable to load published courses.";

        if (isMounted) {
          setError(message);
          setCourses([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
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
      const { error } = (await supabase.rpc(
        "create_enrollment_for_student",
        {
          p_course_id: courseId,
        } as never
      )) as {
        error: { message?: string } | null;
      };

      if (error) throw error;

      setCourses((currentCourses) =>
        currentCourses.map((course) =>
          course.id === courseId
            ? { ...course, enrolled: true }
            : course
        )
      );

      setNotice("Enrollment successful.");
    } catch (enrollError) {
      const message =
        enrollError instanceof Error
          ? enrollError.message
          : "Unable to enroll in this course at this time.";

      setNotice(message);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (role === null) {
    return (
      <PageShell title="Courses" description="Checking access...">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-medium text-slate-700 shadow-sm">
          Loading courses...
        </div>
      </PageShell>
    );
  }

  if (role !== "student") {
    return (
      <AdminCourseCatalog
        courses={adminCourses}
        loading={adminLoading}
        error={adminError}
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
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {notice && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Loading published courses...
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              No published courses available
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              New learning programs will appear here when they are published.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => {
              const isEnrolled = course.enrolled === true;

              return (
                <article
                  key={course.id}
                  className="flex h-full flex-col overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="h-44 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-44 items-center justify-center bg-gradient-to-br from-emerald-100 to-slate-100 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Course
                    </div>
                  )}

                  <div className="flex h-full flex-col p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {course.title}
                      </h3>

                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                        Published
                      </span>
                    </div>

                    <p className="flex-1 text-sm leading-6 text-slate-600">
                      {course.description ||
                        course.short_description ||
                        "No description available."}
                    </p>

                    {isEnrolled ? (
                      <Link
                        href={`/learn/${course.id}`}
                        className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        Continue Learning
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleEnroll(course.id)}
                        disabled={Boolean(actionLoadingId)}
                        className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-200 transition hover:bg-emerald-600 disabled:opacity-70"
                      >
                        {actionLoadingId === course.id
                          ? "Enrolling..."
                          : "Enroll"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
