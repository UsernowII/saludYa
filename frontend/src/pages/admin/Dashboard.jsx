import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { appointmentService } from '../../services/appointmentService'
import AppBar from '../../components/AppBar'

const INITIAL_METRICS = {
  total:      null,
  confirmed:  null,
  cancelled:  null,
  rate:       null,
}

export default function AdminDashboard() {
  const navigate = useNavigate()

  const [metrics, setMetrics] = useState(INITIAL_METRICS)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const todayLabel = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  useEffect(() => {
    let cancelled = false

    async function fetchMetrics() {
      try {
        const data = await appointmentService.getAdminMetrics()
        if (!cancelled) {
          const total     = data?.total     ?? 0
          const confirmed = data?.confirmed ?? 0
          const cancelled_ = data?.cancelled ?? 0
          const rate      = total > 0
            ? `${Math.round((cancelled_ / total) * 100)}%`
            : '0%'

          setMetrics({ total, confirmed, cancelled: cancelled_, rate })
        }
      } catch {
        if (!cancelled) setError('No se pudieron cargar las métricas.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchMetrics()
    return () => { cancelled = true }
  }, [])

  const kpis = [
    {
      label: 'Total citas hoy',
      value: loading ? '…' : (metrics.total ?? '—'),
      color: 'var(--primary-400)',
    },
    {
      label: 'Confirmadas',
      value: loading ? '…' : (metrics.confirmed ?? '—'),
      color: 'var(--success-600)',
    },
    {
      label: 'Canceladas',
      value: loading ? '…' : (metrics.cancelled ?? '—'),
      color: 'var(--error-600)',
    },
    {
      label: 'Tasa cancelación',
      value: loading ? '…' : (metrics.rate ?? '—'),
      color: 'var(--warning-600)',
    },
  ]

  const handleManageDoctors = () => {
    navigate('/admin/doctors')
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-neutral)' }}>
      <AppBar title="Dashboard" />

      <main style={{ padding: 'var(--space-4)' }}>
        {/* Date header */}
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--gray-500)',
            textTransform: 'capitalize',
            marginBottom: 'var(--space-5)',
          }}
        >
          {todayLabel}
        </p>

        {/* Error */}
        {error && (
          <div className="alert alert--error">{error}</div>
        )}

        {/* KPI grid */}
        <h2 className="section-title">Resumen del día</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-6)',
          }}
        >
          {kpis.map(({ label, value, color }) => (
            <div
              key={label}
              className="kpi-card"
              style={{ borderLeftColor: color }}
            >
              <p className="kpi-card__label">{label}</p>
              <p className="kpi-card__value">{value}</p>
            </div>
          ))}
        </div>

        {/* Management actions */}
        <h2 className="section-title">Administración</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <button
            className="btn btn--primary btn--block"
            onClick={handleManageDoctors}
          >
            👨‍⚕️ Gestionar médicos
          </button>
          <button
            className="btn btn--secondary btn--block"
            onClick={() => alert('Gestión de pacientes próximamente disponible.')}
          >
            🧑‍🤝‍🧑 Gestionar pacientes
          </button>
          <button
            className="btn btn--secondary btn--block"
            onClick={() => alert('Reportes próximamente disponibles.')}
          >
            📊 Ver reportes
          </button>
        </div>
      </main>
    </div>
  )
}
