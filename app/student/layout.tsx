import ProtectedRoute from "../auth/protected-route";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
