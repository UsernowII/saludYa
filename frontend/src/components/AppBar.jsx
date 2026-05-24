import React, { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

/**
 * AppBar
 *
 * Props:
 *   title     string   – page title shown in the center
 *   showBack  bool     – show a back arrow button on the left
 *   onBack    func     – callback for the back button
 */
export default function AppBar({ title, showBack = false, onBack }) {
  const { user } = useContext(AuthContext)

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : '?'

  return (
    <header className="appbar">
      {/* Left slot */}
      <div style={{ minWidth: 36 }}>
        {showBack && (
          <button
            className="appbar__back"
            onClick={onBack}
            aria-label="Volver"
          >
            &#8592;
          </button>
        )}
      </div>

      {/* Title */}
      <h1 className="appbar__title">{title}</h1>

      {/* Right slot – user avatar */}
      <div className="appbar__right">
        {user && (
          <div className="avatar avatar--sm" title={user.name}>
            {initial}
          </div>
        )}
      </div>
    </header>
  )
}
