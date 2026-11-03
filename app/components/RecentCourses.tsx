
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpenText, Users } from "lucide-react";
import { supabase } from "@/src/lib/supabase/client";

type CourseRecord = {
  id: string;
  title: string;
  status: string | null;
  instructor_id: string | null;
  created_at: string;
};

type InstructorRecord = {
  id: string;
  full_name: string | null;
};

type EnrollmentRecord = {
  course_id: string;
};

type RecentCourse = {
  id: string;
  title: string;
  instructor: string;
  students: number;
  status: string;
  color: string;
};

const courseColors = [
  "from-emerald-400 via-emerald-500 to-teal-500",
  "from-violet-400 via-purple-500 to-indigo-500",
  "from-amber-400 via-orange-500 to-rose-500",
];

export default function RecentCourses() {
  const [courses, setCourses] = useState<RecentCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentCourses = async () => {
      try {
        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(3);

        if (courseError) throw courseError;

        const courseRecords = (courseData ?? []) as unknown as CourseRecord[];

        if (courseRecords.length === 0) {
          setCourses([]);
          return;
        }

        const instructorIds = [
          ...new Set(
            courseRecords
              .map((course) => course.instructor_id)
              .filter((id): id is string => Boolean(id))
          ),
        ];

        const courseIds = courseRecords.map((course) => course.id);

        const [instructorResult, enrollmentResult] = await Promise.all([
          instructorIds.length > 0
            ? supabase
                .from("profiles")
                .select("id, full_name")
                .in("id", instructorIds)
            : Promise.resolve({ data: [], error: null }),

          supabase
            .from("enrollments")
            .select("course_id")
            .in("course_id", courseIds),
        ]);

        if (instructorResult.error) throw instructorResult.error;
        if (enrollmentResult.error) throw enrollmentResult.error;

        const instructors = (instructorResult.data ??
          []) as unknown as InstructorRecord[];

        const enrollments = (enrollmentResult.data ??
          []) as unknown as EnrollmentRecord[];

        const recentCourses = courseRecords.map((course, index) => {
          const instructor = instructors.find(
            (item) => item.id === course.instructor_id
          );

          const studentCount = enrollments.filter(
            (enrollment) => enrollment.course_id === course.id
          ).length;

          return {
            id: course.id,
            title: course.title,
            instructor: instructor?.full_name || "Not assigned",
            students: studentCount,
            status: course.status || "Not specified",
            color: courseColors[index % courseColors.length],
          };
        });

        setCourses(recentCourses);
      } catch (error) {
        console.error("Recent courses error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentCourses();
  }, []);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">
            Recent Courses
          </h3>
          <p className="text-sm text-slate-500">
            Latest learning programs
          </p>
        </div>

        <Link
          href="/courses"
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600"
        >
          View all
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-500">
          Loading courses...
        </p>
      ) : courses.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          No courses found.
        </p>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => (
            <article
              key={course.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
            >
              <div className={`h-28 bg-gradient-to-r ${course.color}`} />

              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900">
                      {course.title}
                    </h4>
                    <p className="mt-1 text-sm text-slate-500">
                      Instructor: {course.instructor}
                    </p>
                  </div>

                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    {course.status}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-500" />
                    {course.students} students
                  </div>

                  <div className="flex items-center gap-2 text-emerald-600">
                    <BookOpenText className="h-4 w-4" />
                    Course
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
