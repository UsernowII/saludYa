import React, { useState, useContext } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'

export default function Login() {
  const { login }  = useContext(AuthContext)
  const navigate   = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error   ||
        'Credenciales incorrectas. Intenta de nuevo.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-page">
      <div className="form-page__inner">
        {/* Logo / brand */}
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
            SaludYa
          </h1>
          <p style={{ color: 'var(--gray-500)', marginTop: 'var(--space-1)' }}>
            Inicia sesión en tu cuenta
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
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
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
                Ingresando…
              </>
            ) : (
              'Iniciar sesión'
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: '0.9375rem', color: 'var(--gray-600)' }}>
          ¿No tienes cuenta?{' '}
          <Link to="/register" style={{ fontWeight: 600 }}>
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  )
}
