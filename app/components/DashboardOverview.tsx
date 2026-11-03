
"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  GraduationCap,
  UserCheck,
  Users,
} from "lucide-react";
import StatCard from "./StatCard";
import { supabase } from "@/src/lib/supabase/client";

type DashboardStats = {
  students: number;
  teachers: number;
  courses: number;
  enrollments: number;
};

const DashboardOverview = () => {
  const [stats, setStats] = useState<DashboardStats>({
    students: 0,
    teachers: 0,
    courses: 0,
    enrollments: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const [
          studentsResult,
          teachersResult,
          coursesResult,
          enrollmentsResult,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("role", "student"),

          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("role", "instructor"),

          supabase
            .from("courses")
            .select("*", { count: "exact", head: true }),

          supabase
            .from("enrollments")
            .select("*", { count: "exact", head: true }),
        ]);

        const error =
          studentsResult.error ||
          teachersResult.error ||
          coursesResult.error ||
          enrollmentsResult.error;

        if (error) {
          console.error("Dashboard stats error:", error);
          return;
        }

        setStats({
          students: studentsResult.count ?? 0,
          teachers: teachersResult.count ?? 0,
          courses: coursesResult.count ?? 0,
          enrollments: enrollmentsResult.count ?? 0,
        });
      } catch (error) {
        console.error("Failed to load dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  const statCards = [
    {
      title: "Total Students",
      value: stats.students.toLocaleString(),
      change: "Live data",
      icon: <Users className="h-5 w-5" />,
    },
    {
      title: "Total Teachers",
      value: stats.teachers.toLocaleString(),
      change: "Live data",
      icon: <GraduationCap className="h-5 w-5" />,
    },
    {
      title: "Total Courses",
      value: stats.courses.toLocaleString(),
      change: "Live data",
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      title: "Total Enrollments",
      value: stats.enrollments.toLocaleString(),
      change: "Live data",
      icon: <UserCheck className="h-5 w-5" />,
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {statCards.map((stat) => (
        <StatCard
          key={stat.title}
          title={stat.title}
          value={loading ? "..." : stat.value}
          change={stat.change}
          icon={stat.icon}
        />
      ))}
    </section>
  );
};

export default DashboardOverview;
