
"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import { normalizeRole } from "@/src/lib/auth";
import { supabase } from "@/src/lib/supabase/client";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Courses", href: "/courses", icon: BookOpen },
  { label: "Students", href: "/students", icon: Users },
  { label: "Teachers", href: "/teachers", icon: GraduationCap },
  { label: "Assignments", href: "/assignments", icon: ClipboardList },
  { label: "Quizzes", href: "/quizzes", icon: HelpCircle },
  { label: "Progress", href: "/progress", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

function SidebarContent() {
  const pathname = usePathname();
  const router = useRouter();

  const [role, setRole] = useState<
    "admin" | "instructor" | "student" | null
  >(null);

  useEffect(() => {
    let isMounted = true;

    const loadRole = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted || !session) {
        return;
      }

      const profileResult = (await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle()) as {
        data: { role?: "admin" | "instructor" | "student" } | null;
        error: { code?: string } | null;
      };

      if (!isMounted) return;

      const nextRole = normalizeRole(profileResult.data?.role ?? "student");
      setRole(nextRole);
    };

    void loadRole();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!nextSession) {
        if (isMounted) setRole(null);
        return;
      }

      const profileResult = (await supabase
        .from("profiles")
        .select("role")
        .eq("id", nextSession.user.id)
        .maybeSingle()) as {
        data: { role?: "admin" | "instructor" | "student" } | null;
        error: { code?: string } | null;
      };

      if (!isMounted) return;

      setRole(normalizeRole(profileResult.data?.role ?? "student"));
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Redirect even if sign-out encounters an error.
    }

    router.push("/dashboard");
  };

  const assignmentHref =
    role === "student" ? "/student/assignments" : "/assignments";

  const displayNavItems = navItems.map((item) =>
    item.label === "Assignments"
      ? { ...item, href: assignmentHref }
      : item
  );

  return (
    <aside className="flex h-screen w-full max-w-[280px] flex-col border-r border-slate-200 bg-white px-5 py-6 shadow-sm">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-lg font-bold text-white shadow-md shadow-emerald-200">
          LMS
        </div>

        <div>
          <p className="text-lg font-bold tracking-tight text-slate-900">
            LearnHub
          </p>
          <p className="text-xs text-slate-500">Management Suite</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {displayNavItems.map(({ label, href, icon: Icon }) => {
          const isActive =
            pathname === href ||
            (href === "/dashboard" && pathname === "/");

          return (
            <Link
              key={label}
              href={href}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-all ${
                isActive
                  ? "bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-100"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

export default function Sidebar() {
  return (
    <Suspense
      fallback={
        <aside className="h-screen w-full max-w-[280px] border-r border-slate-200 bg-white" />
      }
    >
      <SidebarContent />
    </Suspense>
  );
}
