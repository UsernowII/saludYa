import React, { useEffect, useState } from 'react'
import { appointmentService } from '../../services/appointmentService'
import AppBar from '../../components/AppBar'
import BottomNav from '../../components/BottomNav'
import AppointmentCard from '../../components/AppointmentCard'

const TABS = [
  { key: 'upcoming', label: 'Próximas' },
  { key: 'past',     label: 'Pasadas'  },
]

export default function MyAppointments() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [activeTab, setActiveTab] = useState('upcoming')

  useEffect(() => {
    let cancelled = false

    async function fetchAppointments() {
      try {
        const data = await appointmentService.getMyAppointments()
        if (!cancelled) setAppointments(data || [])
      } catch {
        if (!cancelled) setError('No se pudieron cargar tus citas.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAppointments()
    return () => { cancelled = true }
  }, [])

  const handleCancel = async (appointment) => {
    const confirmed = window.confirm(
      `¿Seguro que deseas cancelar tu cita del ${
        new Date(appointment.scheduled_at || appointment.scheduledAt)
          .toLocaleDateString('es-CO', { weekday: 'long', month: 'long', day: 'numeric' })
      }?`
    )
    if (!confirmed) return

    try {
      await appointmentService.cancel(appointment.id)
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === appointment.id ? { ...a, status: 'cancelled' } : a
        )
      )
    } catch {
      alert('No se pudo cancelar la cita. Intenta de nuevo.')
    }
  }

  const handleReschedule = () => {
    alert('Función de reprogramación próximamente disponible.')
  }

  // Separate upcoming vs past
  const now = new Date()

  const upcoming = appointments
    .filter((a) => {
      const date = new Date(a.scheduled_at || a.scheduledAt)
      return (a.status === 'confirmed' || a.status === 'pending') && date >= now
    })
    .sort((a, b) => {
      const dateA = new Date(a.scheduled_at || a.scheduledAt)
      const dateB = new Date(b.scheduled_at || b.scheduledAt)
      return dateA - dateB
    })

  const past = appointments
    .filter((a) => {
      const date = new Date(a.scheduled_at || a.scheduledAt)
      return a.status === 'cancelled' || a.status === 'completed' || date < now
    })
    .sort((a, b) => {
      const dateA = new Date(a.scheduled_at || a.scheduledAt)
      const dateB = new Date(b.scheduled_at || b.scheduledAt)
      return dateB - dateA // descending for past
    })

  const displayedList = activeTab === 'upcoming' ? upcoming : past

  return (
    <div className="page">
      <AppBar title="Mis citas" />

      <main style={{ padding: 'var(--space-4)' }}>
        {/* Tab bar */}
        <div className="tabs">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              className={`tab${activeTab === key ? ' tab--active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              {label}
              {key === 'upcoming' && upcoming.length > 0 && (
                <span
                  style={{
                    marginLeft: 'var(--space-2)',
                    background: 'var(--primary-600)',
                    color: 'var(--white)',
                    borderRadius: 'var(--radius-full)',
                    padding: '1px 7px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {upcoming.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-10)' }}>
            <div className="spinner spinner--lg" role="status" aria-label="Cargando citas..." />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="alert alert--error">{error}</div>
        )}

        {/* Appointment list */}
        {!loading && !error && displayedList.length > 0 && (
          <div>
            {displayedList.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onCancel={activeTab === 'upcoming' ? handleCancel : undefined}
                onReschedule={activeTab === 'upcoming' ? handleReschedule : undefined}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && displayedList.length === 0 && (
          <div className="empty-state">
            <span className="empty-state__icon">
              {activeTab === 'upcoming' ? '📅' : '🗂️'}
            </span>
            <p className="empty-state__text">
              {activeTab === 'upcoming'
                ? 'No tienes citas próximas.'
                : 'No tienes citas pasadas.'}
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
