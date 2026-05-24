import React, { useReducer, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { bookingReducer, initialState } from '../../reducers/bookingReducer'
import { appointmentService } from '../../services/appointmentService'
import AppBar from '../../components/AppBar'
import BottomNav from '../../components/BottomNav'

// Specialty icons mapping (fallback to 🩺)
const SPECIALTY_ICONS = {
  'Medicina General':      '👨‍⚕️',
  'Cardiología':           '❤️',
  'Dermatología':          '🧴',
  'Ginecología':           '🌸',
  'Oftalmología':          '👁️',
  'Ortopedia':             '🦴',
  'Pediatría':             '🧒',
  'Psicología':            '🧠',
  'Odontología':           '🦷',
  'Nutrición':             '🥗',
}

function getSpecialtyIcon(name) {
  return SPECIALTY_ICONS[name] ?? '🩺'
}

function todayISO() {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

function formatScheduledAt(date, slot) {
  // slot is expected to be "HH:mm"
  return `${date}T${slot}:00`
}

function formatDisplayDateTime(date, slot) {
  const dt = new Date(`${date}T${slot}:00`)
  const dateStr = dt.toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const timeStr = dt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  return { dateStr, timeStr }
}

/* ── Step components ─────────────────────────────────────── */

function StepSpecialty({ dispatch }) {
  const [specialties, setSpecialties] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')

  useEffect(() => {
    let cancelled = false
    appointmentService.getSpecialties()
      .then((data) => { if (!cancelled) setSpecialties(data || []) })
      .catch(() => { if (!cancelled) setError('No se pudieron cargar las especialidades.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-10)' }}>
        <div className="spinner spinner--lg" />
      </div>
    )
  }

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <h2 className="section-title">¿Qué especialidad necesitas?</h2>
      {error && <div className="alert alert--error">{error}</div>}
      <div className="specialty-grid">
        {specialties.map((s) => (
          <button
            key={s.id}
            className="specialty-card"
            onClick={() => dispatch({ type: 'SELECT_SPECIALTY', payload: s })}
          >
            <div className="specialty-card__icon">{getSpecialtyIcon(s.name)}</div>
            <div className="specialty-card__name">{s.name}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function StepDate({ state, dispatch }) {
  const [date, setDate] = useState(state.date || '')

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <h2 className="section-title">Selecciona una fecha</h2>
      <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-4)' }}>
        Especialidad: <strong>{state.specialty?.name}</strong>
      </p>
      <div className="input-group">
        <label htmlFor="booking-date">Fecha de la cita</label>
        <input
          id="booking-date"
          type="date"
          min={todayISO()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <button
        className="btn btn--primary btn--block btn--lg"
        disabled={!date}
        onClick={() => dispatch({ type: 'SELECT_DATE', payload: date })}
        style={{ marginTop: 'var(--space-2)' }}
      >
        Continuar
      </button>
    </div>
  )
}

function StepDoctorSlot({ state, dispatch }) {
  const [doctors, setDoctors]  = useState([])
  const [loading, setLoading]  = useState(true)
  const [error, setError]      = useState('')
  const [selected, setSelected] = useState(null) // { doctorId, slot }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    appointmentService.getAvailable(state.specialty.id, state.date)
      .then((data) => { if (!cancelled) setDoctors(data || []) })
      .catch(() => { if (!cancelled) setError('No hay disponibilidad para esa fecha.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [state.specialty.id, state.date])

  const displayDate = new Date(state.date + 'T00:00:00').toLocaleDateString('es-CO', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  const handleSlotClick = (doctor, slot) => {
    setSelected({ doctorId: doctor.id, slot })
  }

  const handleContinue = () => {
    if (!selected) return
    const doctor = doctors.find((d) => d.id === selected.doctorId)
    dispatch({
      type: 'SELECT_SLOT',
      payload: { doctor, slot: selected.slot },
    })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-10)' }}>
        <div className="spinner spinner--lg" />
      </div>
    )
  }

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <h2 className="section-title">Elige médico y horario</h2>
      <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-4)' }}>
        {state.specialty?.name} · {displayDate}
      </p>

      {error && <div className="alert alert--error">{error}</div>}

      {!error && doctors.length === 0 && (
        <div className="empty-state">
          <span className="empty-state__icon">🗓️</span>
          <p className="empty-state__text">No hay médicos disponibles para esta fecha.</p>
        </div>
      )}

      {doctors.map((doctor) => (
        <div key={doctor.id} className="doctor-group">
          <div className="doctor-group__header">
            <div className="avatar avatar--md">{doctor.name?.charAt(0) ?? 'D'}</div>
            <div>
              <div className="doctor-group__name">Dr. {doctor.name}</div>
              <div className="doctor-group__specialty">{doctor.specialty || state.specialty?.name}</div>
            </div>
          </div>
          <div className="time-slots">
            {(doctor.slots || []).map((slot) => {
              const isSelected = selected?.doctorId === doctor.id && selected?.slot === slot
              return (
                <button
                  key={slot}
                  className={`time-slot time-slot--${isSelected ? 'selected' : 'available'}`}
                  onClick={() => handleSlotClick(doctor, slot)}
                >
                  {slot}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {doctors.length > 0 && (
        <button
          className="btn btn--primary btn--block btn--lg"
          disabled={!selected}
          onClick={handleContinue}
          style={{ marginTop: 'var(--space-4)' }}
        >
          Continuar
        </button>
      )}
    </div>
  )
}

function StepConfirm({ state, dispatch, onConfirm, loading }) {
  if (!state.doctor || !state.slot || !state.date) return null
  const { dateStr, timeStr } = formatDisplayDateTime(state.date, state.slot)

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <h2 className="section-title">Confirma tu cita</h2>

      <div className="card">
        <div className="confirm-row">
          <span className="confirm-row__label">Especialidad</span>
          <span className="confirm-row__value">{state.specialty?.name}</span>
        </div>
        <div className="confirm-row">
          <span className="confirm-row__label">Médico</span>
          <span className="confirm-row__value">Dr. {state.doctor?.name}</span>
        </div>
        <div className="confirm-row">
          <span className="confirm-row__label">Fecha</span>
          <span className="confirm-row__value" style={{ textTransform: 'capitalize' }}>{dateStr}</span>
        </div>
        <div className="confirm-row">
          <span className="confirm-row__label">Hora</span>
          <span className="confirm-row__value">{timeStr}</span>
        </div>
      </div>

      <button
        className="btn btn--primary btn--block btn--lg"
        onClick={onConfirm}
        disabled={loading}
        style={{ marginTop: 'var(--space-6)' }}
      >
        {loading ? (
          <>
            <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
            Agendando…
          </>
        ) : (
          '✅ Confirmar cita'
        )}
      </button>

      <button
        className="btn btn--ghost btn--block"
        onClick={() => dispatch({ type: 'RESET' })}
        style={{ marginTop: 'var(--space-2)' }}
      >
        Cambiar horario
      </button>
    </div>
  )
}

function StepSuccess({ state, navigate }) {
  if (!state.doctor || !state.slot || !state.date) return null
  const { dateStr, timeStr } = formatDisplayDateTime(state.date, state.slot)

  return (
    <div className="success-screen">
      <div className="success-screen__icon">✅</div>
      <h2 className="success-screen__title">¡Cita agendada!</h2>
      <p className="success-screen__subtitle">
        Tu cita con el Dr. {state.doctor?.name} fue confirmada.
      </p>
      <div className="card" style={{ width: '100%', maxWidth: 320, textAlign: 'left' }}>
        <div className="confirm-row">
          <span className="confirm-row__label">Fecha</span>
          <span className="confirm-row__value" style={{ textTransform: 'capitalize' }}>{dateStr}</span>
        </div>
        <div className="confirm-row">
          <span className="confirm-row__label">Hora</span>
          <span className="confirm-row__value">{timeStr}</span>
        </div>
      </div>
      <button
        className="btn btn--primary btn--lg"
        onClick={() => navigate('/appointments')}
        style={{ marginTop: 'var(--space-2)' }}
      >
        Ver mis citas
      </button>
    </div>
  )
}

/* ── Main component ──────────────────────────────────────── */

const TOTAL_STEPS = 4

export default function BookAppointment() {
  const navigate               = useNavigate()
  const [state, dispatch]      = useReducer(bookingReducer, initialState)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmError, setConfirmError]     = useState('')

  const handleBack = () => {
    if (state.step <= 1) {
      navigate(-1)
    } else {
      dispatch({ type: 'BACK' })
    }
  }

  const handleConfirm = async () => {
    setConfirmError('')
    setConfirmLoading(true)
    try {
      const scheduledAt = formatScheduledAt(state.date, state.slot)
      await appointmentService.create(state.doctor.id, scheduledAt, '')
      dispatch({ type: 'CONFIRM' })
    } catch (err) {
      setConfirmError(
        err.response?.data?.message || 'No se pudo agendar la cita. Intenta de nuevo.'
      )
    } finally {
      setConfirmLoading(false)
    }
  }

  return (
    <div className="page">
      <AppBar
        title="Agendar cita"
        showBack={state.step < 5}
        onBack={handleBack}
      />

      {/* Step indicator */}
      {state.step < 5 && (
        <div className="step-indicator">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`step-dot${
                i + 1 === state.step ? ' step-dot--active'
                : i + 1 < state.step  ? ' step-dot--done'
                : ''
              }`}
            />
          ))}
        </div>
      )}

      {/* Confirm error */}
      {confirmError && (
        <div style={{ padding: '0 var(--space-4)' }}>
          <div className="alert alert--error">{confirmError}</div>
        </div>
      )}

      {/* Step content */}
      {state.step === 1 && (
        <StepSpecialty dispatch={dispatch} />
      )}

      {state.step === 2 && (
        <StepDate state={state} dispatch={dispatch} />
      )}

      {state.step === 3 && (
        <StepDoctorSlot state={state} dispatch={dispatch} />
      )}

      {state.step === 4 && (
        <StepConfirm
          state={state}
          dispatch={dispatch}
          onConfirm={handleConfirm}
          loading={confirmLoading}
        />
      )}

      {state.step === 5 && (
        <StepSuccess state={state} navigate={navigate} />
      )}

      {state.step < 5 && <BottomNav />}
    </div>
  )
}
