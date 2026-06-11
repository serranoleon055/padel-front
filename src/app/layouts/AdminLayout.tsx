import { CalendarClock, CalendarDays, Layers, LayoutDashboard, LogOut, MapPin, Menu, ShieldCheck, Sigma, Tag, Trophy, UserCog, Users, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import { useAuth } from '@/app/providers/AuthContext'
import { brand } from '@/config/brand'
import { homeApi } from '@/features/home/homeApi'
import { cn } from '@/shared/lib/utils'
import type { TemporadaResponse } from '@/shared/types/api'

const NAV = [
  { to: '/admin', label: 'Panel', icon: LayoutDashboard, end: true },
  { to: '/admin/jugadores', label: 'Jugadores', icon: Users, end: false },
  { to: '/admin/categorias', label: 'Categorías', icon: Tag, end: false },
  { to: '/admin/lugares', label: 'Lugares', icon: MapPin, end: false },
  { to: '/admin/turnos', label: 'Turnos', icon: CalendarClock, end: false },
  { to: '/admin/temporadas', label: 'Temporadas', icon: CalendarDays, end: false },
  { to: '/admin/torneos', label: 'Torneos', icon: Trophy, end: false },
  { to: '/admin/plantillas-formato', label: 'Plantillas formato', icon: Layers, end: false },
  { to: '/admin/plantillas-puntos', label: 'Plantillas puntos', icon: Sigma, end: false },
  { to: '/admin/usuarios-admin', label: 'Usuarios admin', icon: UserCog, end: false },
]

export function AdminLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [activeSeason, setActiveSeason] = useState<TemporadaResponse | null>(null)

  useEffect(() => {
    homeApi.getAdminDashboard()
      .then((data) => setActiveSeason(data.temporadaActiva ?? null))
      .catch(() => {})
  }, [])

  const handleLogout = useCallback(() => {
    logout()
    navigate('/login', { replace: true })
  }, [logout, navigate])

  return (
    <div className="grid min-h-svh bg-rp-bg text-rp-text lg:grid-cols-[260px_1fr]">
      {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}

      <aside className={cn('admin-sidebar fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r transition-transform lg:sticky lg:top-0 lg:h-svh lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="admin-sidebar-separador flex items-center gap-3 border-b px-4 py-4">
          <span className="admin-sidebar-logo flex size-10 items-center justify-center rounded-lg">
            <ShieldCheck size={20} />
          </span>
          <span>
            <span className="admin-sidebar-marca block text-sm font-black">Panel Admin</span>
            <span className="admin-sidebar-submarca block text-xs">{brand.name}</span>
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) => cn(
                    'admin-sidebar-enlace flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition',
                    isActive && 'activo',
                  )}
                >
                  <item.icon size={17} />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {activeSeason && (
          <div className="admin-sidebar-temporada mx-3 mb-2 rounded-md border px-3 py-2">
            <p className="admin-sidebar-temporada-titulo text-[10px] font-black uppercase tracking-[0.12em]">Temporada activa</p>
            <p className="admin-sidebar-temporada-valor mt-0.5 text-xs font-bold">{activeSeason.nombre}</p>
          </div>
        )}

        <div className="admin-sidebar-separador border-t px-3 py-4">
          <button onClick={handleLogout} className="admin-sidebar-salir flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition">
            <LogOut size={17} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="admin-topbar flex h-14 items-center justify-between border-b px-4 lg:hidden">
          <span className="admin-topbar-titulo text-sm font-black">Panel Admin</span>
          <div className="flex items-center gap-2">
            <button onClick={handleLogout} className="admin-topbar-boton admin-topbar-boton-salir flex size-9 items-center justify-center rounded-md" aria-label="Cerrar sesión">
              <LogOut size={18} />
            </button>
            <button onClick={() => setOpen(!open)} className="admin-topbar-boton flex size-9 items-center justify-center rounded-md" aria-label="Abrir menú">
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-4 sm:px-5 lg:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
