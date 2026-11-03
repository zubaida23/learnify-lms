import React from 'react';
import { ArrowUpRight, BookOpenText, Users } from "lucide-react";

const courses = [
  {
    title: "Advanced React Patterns",
    instructor: "Sarah Johnson",
    students: 184,
    status: "Active",
    color: "from-emerald-400 via-emerald-500 to-teal-500",
  },
  {
    title: "UX Research Essentials",
    instructor: "Michael Lee",
    students: 132,
    status: "In Review",
    color: "from-violet-400 via-purple-500 to-indigo-500",
  },
  {
    title: "Data Storytelling",
    instructor: "Emma Clark",
    students: 96,
    status: "Scheduled",
    color: "from-amber-400 via-orange-500 to-rose-500",
  },
];

const RecentCourses = () => {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Recent Courses</h3>
          <p className="text-sm text-slate-500">Latest learning programs</p>
        </div>
        <button type="button" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600">
          View all
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4">
        {courses.map((course) => (
          <article key={course.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <div className={`h-28 bg-gradient-to-r ${course.color}`} />
            <div className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-lg font-semibold text-slate-900">{course.title}</h4>
                  <p className="mt-1 text-sm text-slate-500">Instructor: {course.instructor}</p>
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
    </section>
  );
};

export default RecentCourses;