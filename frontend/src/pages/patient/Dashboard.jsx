import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../../context/AuthContext'
import { appointmentService } from '../../services/appointmentService'
import AppBar from '../../components/AppBar'
import BottomNav from '../../components/BottomNav'
import AppointmentCard from '../../components/AppointmentCard'

export default function PatientDashboard() {
  const { user }   = useContext(AuthContext)
  const navigate   = useNavigate()

  const [nextAppointment, setNextAppointment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const firstName = user?.name?.split(' ')[0] ?? 'Paciente'

  useEffect(() => {
    let cancelled = false

    async function fetchAppointments() {
      try {
        const appointments = await appointmentService.getMyAppointments()
        if (cancelled) return

        // Find the next upcoming confirmed/pending appointment
        const now = new Date()
        const upcoming = (appointments || [])
          .filter((a) => {
            const date = new Date(a.scheduled_at || a.scheduledAt)
            return (
              date > now &&
              (a.status === 'confirmed' || a.status === 'pending')
            )
          })
          .sort((a, b) => {
            const dateA = new Date(a.scheduled_at || a.scheduledAt)
            const dateB = new Date(b.scheduled_at || b.scheduledAt)
            return dateA - dateB
          })

        setNextAppointment(upcoming[0] ?? null)
      } catch {
        if (!cancelled) setError('No se pudieron cargar tus citas.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAppointments()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="page">
      <AppBar title={`Hola, ${firstName}`} />

      <main>
        {/* Hero banner */}
        <div className="hero-banner">
          <p className="hero-banner__subtitle">¿Cómo te podemos ayudar hoy?</p>
          <h2 className="hero-banner__title">¿Necesitas una cita médica?</h2>
          <button
            className="btn btn--lg"
            style={{
              backgroundColor: 'var(--white)',
              color: 'var(--primary-700)',
              borderColor: 'var(--white)',
            }}
            onClick={() => navigate('/appointments/book')}
          >
            🔍 Buscar disponibilidad
          </button>
        </div>

        {/* Next appointment section */}
        <section style={{ padding: '0 var(--space-4)', marginTop: 'var(--space-4)' }}>
          <h2 className="section-title">Tu próxima cita</h2>

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
              <div className="spinner spinner--lg" role="status" aria-label="Cargando citas..." />
            </div>
          )}

          {!loading && error && (
            <div className="alert alert--error">{error}</div>
          )}

          {!loading && !error && nextAppointment && (
            <AppointmentCard appointment={nextAppointment} />
          )}

          {!loading && !error && !nextAppointment && (
            <div className="empty-state">
              <span className="empty-state__icon">📅</span>
              <p className="empty-state__text">No tienes citas próximas programadas.</p>
              <button
                className="btn btn--primary"
                onClick={() => navigate('/appointments/book')}
                style={{ marginTop: 'var(--space-2)' }}
              >
                Agendar ahora
              </button>
            </div>
          )}
        </section>

        {/* Quick actions */}
        <section style={{ padding: '0 var(--space-4)', marginTop: 'var(--space-6)' }}>
          <h2 className="section-title">Accesos rápidos</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <button
              className="card"
              style={{ textAlign: 'center', cursor: 'pointer', border: 'none' }}
              onClick={() => navigate('/appointments')}
            >
              <div style={{ fontSize: '1.75rem', marginBottom: 'var(--space-2)' }}>📋</div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-800)' }}>Mis citas</p>
            </button>
            <button
              className="card"
              style={{ textAlign: 'center', cursor: 'pointer', border: 'none' }}
              onClick={() => navigate('/appointments/book')}
            >
              <div style={{ fontSize: '1.75rem', marginBottom: 'var(--space-2)' }}>➕</div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-800)' }}>Nueva cita</p>
            </button>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
