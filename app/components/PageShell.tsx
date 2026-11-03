import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";

export default function PageShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
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
                  {title}
                </h1>
                <p className="mt-2 text-sm text-slate-500">{description}</p>
              </div>
            </div>

            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
