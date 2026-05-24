import React, { useContext } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'

/**
 * PrivateRoute
 * - Shows a spinner while the auth session is being restored.
 * - Redirects unauthenticated users to /login.
 * - Redirects users whose role is not in allowedRoles to /unauthorized.
 * - Otherwise renders the nested <Outlet />.
 *
 * Props:
 *   allowedRoles  string[]  (optional) – roles permitted to access the route
 */
export default function PrivateRoute({ allowedRoles }) {
  const { user, loading } = useContext(AuthContext)

  if (loading) {
    return (
      <div className="spinner-page">
        <div className="spinner spinner--lg" role="status" aria-label="Cargando..." />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
