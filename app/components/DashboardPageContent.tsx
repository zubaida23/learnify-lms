import Link from "next/link";
import DashboardOverview from "./DashboardOverview";
import EnrollmentChart from "./EnrollmentChart";
import ProgressChart from "./ProgressChart";
import RecentCourses from "./RecentCourses";
import RecentStudents from "./RecentStudents";
import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";

export default function DashboardPageContent() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <div className="hidden md:block">
          <Sidebar />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <TopNavbar />

          <section className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-600">
                  Overview
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                  Learning Management Dashboard
                </h1>
              </div>
              <Link
                href="/courses/new"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-200 transition hover:bg-emerald-600"
              >
                Add New Course
              </Link>
            </div>

            <DashboardOverview />

            <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
              <EnrollmentChart />
              <ProgressChart />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
              <RecentCourses />
              <RecentStudents />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
