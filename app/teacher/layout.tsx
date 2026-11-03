import ProtectedRoute from "../auth/protected-route";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
