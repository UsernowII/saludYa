import React, { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../../context/AuthContext'
import { appointmentService } from '../../services/appointmentService'
import AppBar from '../../components/AppBar'

const STATUS_LABELS = {
  confirmed: 'Confirmada',
  pending:   'Pendiente',
  completed: 'Completada',
  cancelled: 'Cancelada',
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('es-CO', {
    hour:   '2-digit',
    minute: '2-digit',
  })
}

export default function DoctorDashboard() {
  const { user } = useContext(AuthContext)

  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const todayLabel = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  useEffect(() => {
    let cancelled = false

    async function fetchToday() {
      try {
        const data = await appointmentService.getDoctorToday()
        if (!cancelled) {
          setAppointments(
            (data || []).sort((a, b) => {
              const dA = new Date(a.scheduled_at || a.scheduledAt)
              const dB = new Date(b.scheduled_at || b.scheduledAt)
              return dA - dB
            })
          )
        }
      } catch {
        if (!cancelled) setError('No se pudo cargar la agenda de hoy.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchToday()
    return () => { cancelled = true }
  }, [])

  const handleConfigAvailability = () => {
    alert('Configuración de disponibilidad próximamente disponible.')
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-neutral)' }}>
      <AppBar title="Mi agenda" />

      <main style={{ padding: 'var(--space-4)' }}>
        {/* Welcome + date */}
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div className="avatar avatar--lg">
              {user?.name?.charAt(0)?.toUpperCase() ?? 'D'}
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gray-900)' }}>
                Dr. {user?.name ?? 'Médico'}
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)', textTransform: 'capitalize' }}>
                {todayLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Today's agenda */}
        <h2 className="section-title">Citas de hoy</h2>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
            <div className="spinner spinner--lg" role="status" aria-label="Cargando agenda..." />
          </div>
        )}

        {!loading && error && (
          <div className="alert alert--error">{error}</div>
        )}

        {!loading && !error && appointments.length === 0 && (
          <div className="empty-state">
            <span className="empty-state__icon">🗓️</span>
            <p className="empty-state__text">No tienes citas programadas para hoy.</p>
          </div>
        )}

        {!loading && !error && appointments.map((appt) => {
          const status    = appt.status || 'pending'
          const patient   = appt.patient_name || appt.patientName || 'Paciente'
          const timeStr   = formatTime(appt.scheduled_at || appt.scheduledAt)

          return (
            <div
              key={appt.id}
              className="appt-card"
              style={{ borderLeftColor: status === 'confirmed' ? 'var(--success-600)' : 'var(--primary-400)' }}
            >
              <div className="appt-card__header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <div className="avatar avatar--sm">
                    {patient.charAt(0).toUpperCase()}
                  </div>
                  <strong style={{ fontSize: '0.9375rem', color: 'var(--gray-900)' }}>
                    {patient}
                  </strong>
                </div>
                <span className={`badge badge--${status}`}>
                  {STATUS_LABELS[status] ?? status}
                </span>
              </div>
              <div className="appt-card__info">
                <span>🕐 {timeStr}</span>
                {appt.notes && (
                  <span style={{ fontStyle: 'italic', color: 'var(--gray-500)' }}>
                    {appt.notes}
                  </span>
                )}
              </div>
            </div>
          )
        })}

        {/* Configure availability */}
        <div style={{ marginTop: 'var(--space-6)' }}>
          <button
            className="btn btn--secondary btn--block"
            onClick={handleConfigAvailability}
          >
            ⚙️ Configurar disponibilidad
          </button>
        </div>
      </main>
    </div>
  )
}
