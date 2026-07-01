import { ChevronDown } from 'lucide-react'
import { memo, useCallback, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Footer } from '@/shared/ui/Footer'
import { brand } from '@/config/brand'

const navPrincipal = [
  { to: '/', label: 'Inicio' },
  { to: '/reservar', label: 'Turnos' },
  { to: '/torneos', label: 'Torneos' },
  { to: '/ranking', label: 'Ranking' },
  { to: '/precios', label: 'Precios' },
]

const navMas = [
  { to: '/la-sede', label: 'Servicios y galería' },
  { to: '/reglas', label: 'Reglas' },
  { to: '/contacto', label: 'Contacto' },
  { to: '/terminos', label: 'Términos' },
  { to: '/privacidad', label: 'Privacidad' },
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
          {navPrincipal.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nl ${isActive ? 'on' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}

          <div className="nl-dropdown">
            <button type="button" className="nl nl-more" aria-haspopup="true">
              Más
              <ChevronDown size={14} />
            </button>
            <div className="nl-menu">
              {navMas.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nl-menu-item ${isActive ? 'on' : ''}`}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
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
          {[...navPrincipal, ...navMas, { to: '/login', label: 'Admin' }].map((item) => (
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
    <div className="flex min-h-screen flex-col">
      <PublicNavbar
        mobileOpen={mobileOpen}
        onToggleMobile={toggleMobile}
        onCloseMobile={closeMobile}
      />

      <main className="flex-1 pt-[62px]">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
