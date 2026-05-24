import React, { useState, useContext } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { authService } from '../services/authService'

export default function Register() {
  const { login } = useContext(AuthContext)
  const navigate  = useNavigate()

  const [form, setForm] = useState({
    name:            '',
    email:           '',
    phone:           '',
    password:        '',
    confirmPassword: '',
  })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setLoading(true)
    try {
      // Register the new account
      await authService.register({
        name:     form.name.trim(),
        email:    form.email.trim(),
        phone:    form.phone.trim(),
        password: form.password,
      })

      // Immediately log in with the new credentials
      await login(form.email.trim(), form.password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error   ||
        'No se pudo crear la cuenta. Intenta de nuevo.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-page">
      <div className="form-page__inner">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              marginBottom: 'var(--space-4)',
            }}
          >
            🏥
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--gray-900)' }}>
            Crear cuenta
          </h1>
          <p style={{ color: 'var(--gray-500)', marginTop: 'var(--space-1)' }}>
            Regístrate para agendar citas
          </p>
        </div>

        {/* Error alert */}
        {error && (
          <div className="alert alert--error" role="alert">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="input-group">
            <label htmlFor="name">Nombre completo</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Juan Pérez"
              value={form.name}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>

          <div className="input-group">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="tu@correo.com"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          <div className="input-group">
            <label htmlFor="phone">Teléfono</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="300 123 4567"
              value={form.phone}
              onChange={handleChange}
              autoComplete="tel"
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="input-group">
            <label htmlFor="confirmPassword">Confirmar contraseña</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Repite tu contraseña"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--block btn--lg"
            disabled={loading}
            style={{ marginTop: 'var(--space-2)' }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                Creando cuenta…
              </>
            ) : (
              'Crear cuenta'
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: '0.9375rem', color: 'var(--gray-600)' }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" style={{ fontWeight: 600 }}>
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
