import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const NAV_ITEMS = [
  { icon: '🏠', label: 'Inicio',   path: '/dashboard'         },
  { icon: '📅', label: 'Citas',    path: '/appointments'      },
  { icon: '🔍', label: 'Buscar',   path: '/appointments/book' },
  { icon: '👤', label: 'Perfil',   path: '/profile'           },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard'
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {NAV_ITEMS.map(({ icon, label, path }) => (
        <button
          key={path}
          className={`bottom-nav__item${isActive(path) ? ' bottom-nav__item--active' : ''}`}
          onClick={() => navigate(path)}
          aria-current={isActive(path) ? 'page' : undefined}
        >
          <span aria-hidden="true">{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
