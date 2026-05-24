import React from 'react'

const STATUS_LABELS = {
  confirmed:  'Confirmada',
  pending:    'Pendiente',
  cancelled:  'Cancelada',
  completed:  'Completada',
}

function formatDate(dateStr) {
  const date = new Date(dateStr)
  const dateFormatted = date.toLocaleDateString('es-CO', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  })
  const timeFormatted = date.toLocaleTimeString('es-CO', {
    hour:   '2-digit',
    minute: '2-digit',
  })
  return { dateFormatted, timeFormatted }
}

/**
 * AppointmentCard
 *
 * Props:
 *   appointment   object   – appointment data
 *   onCancel      func     – (optional) cancel handler
 *   onReschedule  func     – (optional) reschedule handler
 */
export default function AppointmentCard({ appointment, onCancel, onReschedule }) {
  if (!appointment) return null

  const { dateFormatted, timeFormatted } = formatDate(appointment.scheduled_at || appointment.scheduledAt)
  const status  = appointment.status || 'pending'
  const doctor  = appointment.doctor_name  || appointment.doctorName  || 'Médico'
  const specialty = appointment.specialty_name || appointment.specialtyName || ''

  const canAct = status === 'confirmed' || status === 'pending'

  return (
    <article className="appt-card">
      <div className="appt-card__header">
        <strong style={{ fontSize: '1rem', color: 'var(--gray-900)' }}>
          Dr. {doctor}
        </strong>
        <span className={`badge badge--${status}`}>
          {STATUS_LABELS[status] ?? status}
        </span>
      </div>

      <div className="appt-card__info">
        {specialty && (
          <span>🩺 {specialty}</span>
        )}
        <span>📅 {dateFormatted}</span>
        <span>🕐 {timeFormatted}</span>
        {appointment.notes && (
          <span style={{ color: 'var(--gray-500)', fontStyle: 'italic' }}>
            {appointment.notes}
          </span>
        )}
      </div>

      {canAct && (onCancel || onReschedule) && (
        <div className="appt-card__actions">
          {onReschedule && (
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => onReschedule(appointment)}
            >
              Reprogramar
            </button>
          )}
          {onCancel && (
            <button
              className="btn btn--danger btn--sm"
              onClick={() => onCancel(appointment)}
            >
              Cancelar
            </button>
          )}
        </div>
      )}
    </article>
  )
}
