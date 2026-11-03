export type AppRole = "admin" | "instructor" | "student";

export const DEFAULT_PUBLIC_ROLE: AppRole = "student";

export function normalizeRole(role?: string | null): AppRole {
  if (role === "admin" || role === "instructor" || role === "student") {
    return role;
  }

  return DEFAULT_PUBLIC_ROLE;
}

export function resolveDashboardPath(role?: string | null): string {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "admin") {
    return "/dashboard";
  }

  if (normalizedRole === "instructor") {
    return "/teacher/dashboard";
  }

  return "/student/dashboard";
}

export function humanizeRole(role?: string | null): string {
  const normalizedRole = normalizeRole(role);

  switch (normalizedRole) {
    case "admin":
      return "Admin";
    case "instructor":
      return "Teacher";
    case "student":
      return "Student";
    default:
      return "Student";
  }
}
