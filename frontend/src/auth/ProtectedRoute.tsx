import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "./AuthContext"

/** Redirects to /login when logged out. Pass adminOnly to also require admin role. */
export function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return null
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (adminOnly && user.role !== "admin") return <Navigate to="/" replace />
  return <Outlet />
}
