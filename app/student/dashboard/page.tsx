import Link from "next/link";
import PageShell from "../../components/PageShell";

const enrolledCourses = [
  { title: "Advanced React Patterns", progress: 78, nextLesson: "State Management Essentials" },
  { title: "UX Research Essentials", progress: 64, nextLesson: "Interview Synthesis" },
  { title: "Data Storytelling", progress: 92, nextLesson: "Executive Summary Review" },
];

const upcomingAssignments = [
  { title: "Portfolio Sprint", due: "Due in 2 days", status: "In progress" },
  { title: "UX Audit Reflection", due: "Due in 4 days", status: "Pending" },
  { title: "Research Summary", due: "Due in 6 days", status: "Planned" },
];

const quizResults = [
  { title: "React Fundamentals", score: "88%", date: "May 12" },
  { title: "UX Principles Quiz", score: "94%", date: "May 18" },
  { title: "Data Visualization", score: "81%", date: "May 23" },
];

const recentActivity = [
  "Completed the lesson 'Component Composition Patterns'",
  "Submitted the UX audit reflection",
  "Scored 94% on the UX Principles Quiz",
  "Enrolled in the Data Storytelling course",
];

export default function StudentDashboardPage() {
  return (
    <PageShell
      title="Student Dashboard"
      description="Track your courses, assignments, and learning milestones."
    >
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Enrolled Courses</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">03</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Average Progress</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">78%</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Assignments Due</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">03</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Quiz Average</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">88%</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">My Enrolled Courses</h2>
              <p className="text-sm text-slate-500">Current learning roadmap</p>
            </div>
            <Link href="/courses" className="text-sm font-medium text-emerald-600">
              Browse courses
            </Link>
          </div>

          <div className="space-y-4">
            {enrolledCourses.map((course) => (
              <div key={course.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{course.title}</p>
                    <p className="text-sm text-slate-500">Next: {course.nextLesson}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    {course.progress}%
                  </span>
                </div>
                <div className="mt-3 h-2.5 rounded-full bg-slate-200">
                  <div
                    className="h-2.5 rounded-full bg-emerald-500"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Upcoming Assignments</h2>
          <div className="mt-5 space-y-3">
            {upcomingAssignments.map((assignment) => (
              <div key={assignment.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-900">{assignment.title}</p>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700">
                    {assignment.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">{assignment.due}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Quiz Results</h2>
          <div className="mt-5 space-y-3">
            {quizResults.map((quiz) => (
              <div key={quiz.title} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="font-medium text-slate-900">{quiz.title}</p>
                  <p className="text-sm text-slate-500">{quiz.date}</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  {quiz.score}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Recent Activity</h2>
          <ul className="mt-5 space-y-3">
            {recentActivity.map((item) => (
              <li key={item} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PageShell>
  );
}
