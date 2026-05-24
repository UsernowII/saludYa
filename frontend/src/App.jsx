import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import PrivateRoute from './components/PrivateRoute'

// Public pages
import Login    from './pages/Login'
import Register from './pages/Register'

// Patient pages
import PatientDashboard   from './pages/patient/Dashboard'
import MyAppointments     from './pages/patient/MyAppointments'
import BookAppointment    from './pages/patient/BookAppointment'

// Doctor pages
import DoctorDashboard from './pages/doctor/Dashboard'

// Admin pages
import AdminDashboard from './pages/admin/Dashboard'

function Unauthorized() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-4)',
        padding: 'var(--space-8)',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '3rem' }}>🔒</div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--gray-900)' }}>
        No autorizado
      </h1>
      <p style={{ color: 'var(--gray-500)' }}>
        No tienes permiso para acceder a esta sección.
      </p>
      <a href="/login" className="btn btn--primary">
        Volver al inicio
      </a>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Public routes ───────────────────────────── */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* ── Patient routes ──────────────────────────── */}
        <Route element={<PrivateRoute allowedRoles={['patient']} />}>
          <Route path="/dashboard"           element={<PatientDashboard />} />
          <Route path="/appointments"        element={<MyAppointments />} />
          <Route path="/appointments/book"   element={<BookAppointment />} />
        </Route>

        {/* ── Doctor routes ───────────────────────────── */}
        <Route element={<PrivateRoute allowedRoles={['doctor']} />}>
          <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
        </Route>

        {/* ── Admin routes ────────────────────────────── */}
        <Route element={<PrivateRoute allowedRoles={['admin']} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Route>

        {/* ── Default redirect ───────────────────────── */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* ── Catch-all 404 ──────────────────────────── */}
        <Route
          path="*"
          element={
            <div
              style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-4)',
                padding: 'var(--space-8)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '3rem' }}>🔍</div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--gray-900)' }}>
                Página no encontrada
              </h1>
              <a href="/login" className="btn btn--primary">
                Ir al inicio
              </a>
            </div>
          }
        />

      </Routes>
    </BrowserRouter>
  )
}
