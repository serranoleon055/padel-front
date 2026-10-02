import { Banknote, BarChart3, CalendarClock, CalendarDays, Contact, HelpCircle, Layers, LayoutDashboard, LogOut, MapPin, Menu, Package, Settings, Tag, Trophy, UserCog, Users, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import { useAuth } from '@/app/providers/AuthContext'
import { authApi } from '@/features/auth/authApi'
import { brand } from '@/config/brand'
import { cn } from '@/shared/lib/utils'

/**
 * Agrupado por lo que el club hace, no por entidad del sistema: el que atiende el
 * mostrador vive en "Día a día" y no debería tener que pasar por encima de plantillas
 * de torneo para llegar a la caja.
 *
 * <p>No hay una entrada "Vender" aparte: el Panel es la pantalla del día y la venta se
 * dispara desde ahí. Eran dos pantallas que mostraban lo mismo.
 */
const NAV = [
  {
    grupo: 'Día a día',
    items: [
      { to: '/admin', label: 'Panel', icon: LayoutDashboard, end: true },
      { to: '/admin/turnos', label: 'Turnos', icon: CalendarClock, end: false },
      { to: '/admin/clientes', label: 'Clientes', icon: Contact, end: false },
      { to: '/admin/caja', label: 'Caja', icon: Banknote, end: false },
      { to: '/admin/productos', label: 'Productos y stock', icon: Package, end: false, soloDuenio: true },
    ],
  },
  {
    grupo: 'Negocio',
    items: [
      { to: '/admin/estadisticas', label: 'Estadísticas', icon: BarChart3, end: false, soloDuenio: true },
    ],
  },
  {
    grupo: 'Torneos',
    items: [
      { to: '/admin/torneos', label: 'Torneos', icon: Trophy, end: false },
      { to: '/admin/jugadores', label: 'Jugadores', icon: Users, end: false },
      { to: '/admin/categorias', label: 'Categorías', icon: Tag, end: false },
      { to: '/admin/temporadas', label: 'Temporadas', icon: CalendarDays, end: false },
      { to: '/admin/plantillas', label: 'Plantillas', icon: Layers, end: false },
    ],
  },
  {
    grupo: 'Sistema',
    items: [
      { to: '/admin/lugares', label: 'Sedes y canchas', icon: MapPin, end: false, soloDuenio: true },
      { to: '/admin/usuarios', label: 'Usuarios', icon: UserCog, end: false, soloDuenio: true },
      { to: '/admin/configuracion', label: 'Configuración', icon: Settings, end: false, soloDuenio: true },
      { to: '/admin/como-funciona', label: 'Cómo funciona', icon: HelpCircle, end: false },
    ],
  },
]

/**
 * Lo que el mostrador toca todo el día. En el celular va en una barra fija abajo: llegar a
 * la caja no puede costar abrir el menú, buscar y tocar. Son las cuatro pantallas que
 * cualquiera del club puede abrir, así que la barra es la misma para el dueño y el empleado.
 */
const BARRA_MOVIL = [
  { to: '/admin', label: 'Panel', icon: LayoutDashboard, end: true },
  { to: '/admin/turnos', label: 'Turnos', icon: CalendarClock, end: false },
  { to: '/admin/clientes', label: 'Clientes', icon: Contact, end: false },
  { to: '/admin/caja', label: 'Caja', icon: Banknote, end: false },
]

export function AdminLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  // Cerrar con Escape: el drawer tapa la pantalla entera y en una tablet con teclado la
  // única salida era encontrar el borde de afuera para tocarlo.
  useEffect(() => {
    if (!open) return
    const alPresionar = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [open])

  // Esconder lo que el mostrador no puede abrir es comodidad, no seguridad: quien
  // decide qué se puede hacer es el backend. Acá solo se evita ofrecer un 403.
  const esDuenio = authApi.esDuenio()
  const menu = useMemo(() => NAV
    .map((seccion) => ({
      ...seccion,
      items: seccion.items.filter((item) => esDuenio || !item.soloDuenio),
    }))
    .filter((seccion) => seccion.items.length > 0), [esDuenio])

  const handleLogout = useCallback(() => {
    logout()
    navigate('/login', { replace: true })
  }, [logout, navigate])

  return (
    <div className="grid min-h-svh bg-rp-bg text-rp-text lg:grid-cols-[260px_1fr]">
      {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}

      <aside className={cn('admin-sidebar fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r transition-transform lg:sticky lg:top-0 lg:h-svh lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="admin-sidebar-separador flex items-center gap-3 border-b px-4 py-4">
          {/* El logo del club, el mismo que el navbar público: sale del tema. */}
          <span className="admin-sidebar-logo" aria-hidden="true" />
          <span>
            <span className="admin-sidebar-marca block text-sm font-black">Panel Admin</span>
            <span className="admin-sidebar-submarca block text-xs">{brand.name}</span>
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {menu.map((seccion) => (
            <div key={seccion.grupo} className="mb-1 last:mb-0">
              <p className="admin-sidebar-grupo px-3 pb-0.5 pt-2 text-[10px] font-black uppercase tracking-[0.16em]">
                {seccion.grupo}
              </p>
              <ul className="flex flex-col">
                {seccion.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={() => setOpen(false)}
                      // En el celular el menú es un drawer que se toca con el dedo: los
                      // 32 px de alto que alcanzaban con el mouse quedaban por debajo del
                      // área táctil mínima. En escritorio vuelve a la altura compacta.
                      className={({ isActive }) => cn(
                        'admin-sidebar-enlace flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition lg:min-h-0 lg:py-1.5',
                        isActive && 'activo',
                      )}
                    >
                      <item.icon size={16} />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-separador rp-safe-bottom border-t px-3 py-3">
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
            <button onClick={handleLogout} className="admin-topbar-boton admin-topbar-boton-salir flex size-11 items-center justify-center rounded-md" aria-label="Cerrar sesión">
              <LogOut size={18} />
            </button>
            <button onClick={() => setOpen(!open)} className="admin-topbar-boton flex size-11 items-center justify-center rounded-md" aria-label="Abrir menú">
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </header>

        {/* El pb-24 de abajo deja lugar para la barra fija: sin eso, la última fila de
            cada tabla queda escondida atrás de ella y no se puede tocar. */}
        <main className="min-w-0 flex-1 overflow-x-clip px-4 py-4 pb-24 sm:px-5 lg:px-6 lg:pb-6">
          <Outlet />
        </main>
      </div>

      <nav className="admin-barra-movil rp-safe-bottom fixed inset-x-0 bottom-0 z-30 flex border-t lg:hidden">
        {BARRA_MOVIL.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => cn(
              'admin-barra-movil-enlace flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 pt-2 text-[11px] font-bold',
              isActive && 'activo',
            )}
          >
            <item.icon size={19} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
