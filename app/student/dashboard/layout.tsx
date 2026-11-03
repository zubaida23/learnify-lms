import ProtectedRoute from "../../auth/protected-route";

export default function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRole="student">{children}</ProtectedRoute>;
}
