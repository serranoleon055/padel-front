import { CalendarDays, Layers, LayoutDashboard, LogOut, MapPin, Menu, ShieldCheck, Sigma, Tag, Trophy, UserCog, Users, X } from 'lucide-react'
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

      <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-rp-border bg-rp-surface transition-transform lg:static lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center gap-3 border-b border-rp-border px-4 py-4">
          <span className="flex size-10 items-center justify-center rounded-lg bg-rp-accent text-rp-bg">
            <ShieldCheck size={20} />
          </span>
          <span>
            <span className="block text-sm font-black text-rp-text">Panel Admin</span>
            <span className="block text-xs text-rp-muted">{brand.name}</span>
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
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition',
                    isActive ? 'bg-rp-accent/15 text-rp-accent' : 'text-rp-muted hover:bg-rp-surface-2 hover:text-rp-text',
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
          <div className="mx-3 mb-2 rounded-md border border-rp-accent/30 bg-rp-accent/10 px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-rp-accent">Temporada activa</p>
            <p className="mt-0.5 text-xs font-bold text-rp-text">{activeSeason.nombre}</p>
          </div>
        )}

        <div className="border-t border-rp-border px-3 py-4">
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-rp-muted transition hover:bg-rp-surface-2 hover:text-rp-danger">
            <LogOut size={17} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-rp-border bg-rp-surface px-4 lg:hidden">
          <span className="text-sm font-black text-rp-text">Panel Admin</span>
          <div className="flex items-center gap-2">
            <button onClick={handleLogout} className="flex size-9 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger" aria-label="Cerrar sesión">
              <LogOut size={18} />
            </button>
            <button onClick={() => setOpen(!open)} className="flex size-9 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2" aria-label="Abrir menú">
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
