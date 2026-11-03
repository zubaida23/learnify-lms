import ProtectedRoute from "../auth/protected-route";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRole="admin">{children}</ProtectedRoute>;
}
