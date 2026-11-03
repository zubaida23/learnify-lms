import Link from "next/link";
import PageShell from "../../components/PageShell";

const instructorStats = [
	{ label: "Active Courses", value: "06" },
	{ label: "Students Enrolled", value: "1,284" },
	{ label: "Assignments Pending", value: "18" },
	{ label: "Average Completion", value: "86%" },
];

const coursePerformance = [
	{ title: "Advanced React Patterns", learners: "324 learners", completion: "82%" },
	{ title: "UX Research Essentials", learners: "286 learners", completion: "74%" },
	{ title: "Data Storytelling", learners: "402 learners", completion: "88%" },
];

const classUpdates = [
	"New quiz submitted for review",
	"3 students requested mentorship sessions",
	"Course materials refreshed for Advanced React",
	"Assignment feedback cohort published",
];

export default function TeacherDashboardPage() {
	return (
		<PageShell
			title="Instructor Dashboard"
			description="Monitor course delivery, learner engagement, and teaching outcomes."
		>
			<div className="grid gap-6 lg:grid-cols-4">
				{instructorStats.map((stat) => (
					<div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
						<p className="text-sm text-slate-500">{stat.label}</p>
						<p className="mt-3 text-3xl font-bold text-slate-900">{stat.value}</p>
					</div>
				))}
			</div>

			<div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
				<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
					<div className="mb-5 flex items-center justify-between gap-3">
						<div>
							<h2 className="text-xl font-semibold text-slate-900">Course Performance</h2>
							<p className="text-sm text-slate-500">Current teaching engagement</p>
						</div>
						<Link href="/courses" className="text-sm font-medium text-emerald-600">
							Course catalog
						</Link>
					</div>

					<div className="space-y-4">
						{coursePerformance.map((course) => (
							<div key={course.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
								<div className="flex items-center justify-between gap-3">
									<div>
										<p className="font-semibold text-slate-900">{course.title}</p>
										<p className="text-sm text-slate-500">{course.learners}</p>
									</div>
									<span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
										{course.completion}
									</span>
								</div>
							</div>
						))}
					</div>
				</div>

				<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
					<h2 className="text-xl font-semibold text-slate-900">Class Updates</h2>
					<ul className="mt-5 space-y-3">
						{classUpdates.map((update) => (
							<li key={update} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
								{update}
							</li>
						))}
					</ul>

					<div className="mt-5">
						<Link
							href="/teacher/submissions"
							className="inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
						>
							Review submissions
						</Link>
					</div>
				</div>
			</div>
		</PageShell>
	);
}
