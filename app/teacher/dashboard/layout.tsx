import ProtectedRoute from "../../auth/protected-route";

export default function TeacherDashboardLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRole="instructor">{children}</ProtectedRoute>;
}
