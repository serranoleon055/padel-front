import { memo, useCallback, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Footer } from '@/shared/ui/Footer'
import { brand } from '@/config/brand'

const navItems = [
  { to: '/', label: 'Inicio' },
  { to: '/torneos', label: 'Torneos' },
  { to: '/ranking', label: 'Ranking' },
  { to: '/login', label: 'Admin' },
]

const PublicNavbar = memo(function PublicNavbar({
  mobileOpen,
  onToggleMobile,
  onCloseMobile,
}: {
  mobileOpen: boolean
  onToggleMobile: () => void
  onCloseMobile: () => void
}) {
  return (
    <>
      <nav className="nav">
        <NavLink to="/" className="nlogo">
          <div className="nlogo-icon" aria-hidden="true" />
          <div>
            <div className="nlogo-name">{brand.name}</div>
            <div className="nlogo-sub">{brand.location}</div>
          </div>
        </NavLink>

        <div className="nlinks">
          {navItems.slice(0, 3).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nl ${isActive ? 'on' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <NavLink to="/login" className="nav-cta">
          Admin
        </NavLink>

        <button
          className="hamburger"
          onClick={onToggleMobile}
          aria-label="Menu"
        >
          <span /><span /><span />
        </button>
      </nav>

      {mobileOpen && (
        <div className="mobile-nav-overlay">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onCloseMobile}
              className={({ isActive }) => isActive ? 'on' : ''}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </>
  )
})

export function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const toggleMobile = useCallback(() => setMobileOpen((prev) => !prev), [])
  const closeMobile = useCallback(() => setMobileOpen(false), [])

  return (
    <div className="min-h-screen">
      <PublicNavbar
        mobileOpen={mobileOpen}
        onToggleMobile={toggleMobile}
        onCloseMobile={closeMobile}
      />

      <main className="pt-[62px]">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
