
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase/client";

type CourseRecord = {
  id: string;
  level: string | null;
};

type EnrollmentRecord = {
  course_id: string;
  progress_percent: number | null;
};

type ProgressSegment = {
  label: string;
  value: number;
  color: string;
};

const levelColors: Record<string, string> = {
  beginner: "bg-emerald-500",
  intermediate: "bg-emerald-400",
  advanced: "bg-emerald-300",
  mastery: "bg-slate-200",
};

const defaultLevels = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Mastery",
];

export default function ProgressChart() {
  const [segments, setSegments] = useState<ProgressSegment[]>(
    defaultLevels.map((level) => ({
      label: level,
      value: 0,
      color: levelColors[level.toLowerCase()],
    }))
  );

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourseProgress = async () => {
      try {
        const [coursesResult, enrollmentsResult] = await Promise.all([
          supabase.from("courses").select("id, level"),
          supabase.from("enrollments").select("course_id, progress_percent"),
        ]);

        if (coursesResult.error) throw coursesResult.error;
        if (enrollmentsResult.error) throw enrollmentsResult.error;

        const courses = (coursesResult.data ?? []) as unknown as CourseRecord[];
        const enrollments = (enrollmentsResult.data ?? []) as unknown as EnrollmentRecord[];

        const levels = [...defaultLevels];

        courses.forEach((course) => {
          const level = course.level?.trim();

          if (
            level &&
            !levels.some(
              (existing) => existing.toLowerCase() === level.toLowerCase()
            )
          ) {
            levels.push(level);
          }
        });

        const updatedSegments = levels.map((level) => {
          const courseIds = courses
            .filter(
              (course) =>
                course.level?.toLowerCase() === level.toLowerCase()
            )
            .map((course) => course.id);

          const levelEnrollments = enrollments.filter((enrollment) =>
            courseIds.includes(enrollment.course_id)
          );

          const totalProgress = levelEnrollments.reduce(
            (sum, enrollment) =>
              sum + (Number(enrollment.progress_percent) || 0),
            0
          );

          const averageProgress =
            levelEnrollments.length > 0
              ? Math.round(totalProgress / levelEnrollments.length)
              : 0;

          return {
            label: level,
            value: averageProgress,
            color: levelColors[level.toLowerCase()] ?? "bg-slate-200",
          };
        });

        setSegments(updatedSegments);
      } catch (error) {
        console.error("Course progress chart error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseProgress();
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Course Progress
          </h3>
          <p className="text-sm text-slate-500">
            Average completion by level
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-500">
          Loading course progress...
        </div>
      ) : (
        <div className="space-y-4">
          {segments.map((segment) => (
            <div key={segment.label}>
              <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
                <span>{segment.label}</span>
                <span>{segment.value}%</span>
              </div>

              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${segment.color} transition-all`}
                  style={{ width: `${segment.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
