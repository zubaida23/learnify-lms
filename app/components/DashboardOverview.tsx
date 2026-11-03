import React from 'react';
import { BookOpen, GraduationCap, UserCheck, Users } from "lucide-react";
import StatCard from "./StatCard";

const stats = [
  { title: "Total Students", value: "12,480", change: "+8.2%", icon: <Users className="h-5 w-5" /> },
  { title: "Total Teachers", value: "364", change: "+4.6%", icon: <GraduationCap className="h-5 w-5" /> },
  { title: "Total Courses", value: "128", change: "+12.1%", icon: <BookOpen className="h-5 w-5" /> },
  { title: "Total Enrollments", value: "9,845", change: "+15.4%", icon: <UserCheck className="h-5 w-5" /> },
];

const DashboardOverview = () => {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <StatCard
          key={stat.title}
          title={stat.title}
          value={stat.value}
          change={stat.change}
          icon={stat.icon}
        />
      ))}
    </section>
  );
};

export default DashboardOverview;