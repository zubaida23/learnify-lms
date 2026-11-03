import ProtectedRoute from "../../auth/protected-route";

export default function TeacherSubmissionsLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRole="instructor">{children}</ProtectedRoute>;
}
