import { BarChart3, CalendarDays, CheckCircle2, Trophy, Users } from 'lucide-react'
import { useEffect, useState } from 'react'

import { homeApi } from '@/features/home/homeApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { formatearFecha } from '@/shared/lib/formatters'
import type { AdminDashboardResponse } from '@/shared/types/api'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { StatusMessage } from '@/shared/ui/StatusMessage'

export default function AdminDashboardPage() {
  const [panel, setPanel] = useState<AdminDashboardResponse | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let montado = true

    homeApi
      .getAdminDashboard()
      .then((datos) => {
        if (montado) {
          setPanel(datos)
          setError(null)
        }
      })
      .catch((errorCapturado: unknown) => {
        if (montado) {
          setError(obtenerMensajeErrorApi(errorCapturado))
        }
      })
      .finally(() => {
        if (montado) {
          setCargando(false)
        }
      })

    return () => {
      montado = false
    }
  }, [])

  if (cargando) return <section className="py-8"><StatusMessage type="loading" title="Cargando panel..." /></section>
  if (error) return <section className="py-8"><StatusMessage type="error" title="Error al cargar" description={error} /></section>
  if (!panel) return <section className="py-8"><StatusMessage type="empty" title="Sin datos" /></section>

  const { summary: resumen, temporadaActiva, ultimosTorneos } = panel
  const torneosRecientes = ultimosTorneos.slice(0, 3)

  return (
    <section className="admin-page">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-rp-accent">Admin</p>
      <h1 className="mt-2 text-3xl font-black text-rp-text sm:text-5xl">Panel</h1>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <TarjetaMetrica icon={Trophy} label="Torneos activos" value={resumen.torneosActivos} />
        <TarjetaMetrica icon={BarChart3} label="Torneos totales" value={resumen.torneosTotales} />
        <TarjetaMetrica icon={Users} label="Jugadores" value={resumen.jugadoresRegistrados} />
        <TarjetaMetrica icon={CheckCircle2} label="Partidos finalizados" value={resumen.partidosFinalizados} />
      </div>

      {temporadaActiva && (
        <div className="mt-5 rounded-lg border border-rp-accent/30 bg-rp-accent/5 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-rp-accent">Temporada activa</p>
          <h2 className="mt-2 text-xl font-black text-rp-text">{temporadaActiva.nombre}</h2>
          <p className="mt-1 text-sm text-rp-muted">
            {formatearFecha(temporadaActiva.fechaInicio)} - {temporadaActiva.fechaFin ? formatearFecha(temporadaActiva.fechaFin) : 'En curso'}
          </p>
        </div>
      )}

      {torneosRecientes.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-rp-accent">Últimos torneos</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {torneosRecientes.map((torneo) => (
              <div key={torneo.id} className="rounded-lg border border-rp-border bg-rp-surface/82 p-4">
                <StatusBadge tone={torneo.estado === 'EN_CURSO' ? 'live' : torneo.estado === 'FINALIZADO' ? 'success' : 'warning'}>
                  {torneo.estado}
                </StatusBadge>
                <h4 className="mt-2 line-clamp-2 font-bold text-rp-text">{torneo.nombre}</h4>
                <p className="mt-1 flex items-center gap-1 text-xs text-rp-muted">
                  <CalendarDays size={12} />{formatearFecha(torneo.fechaInicio)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function TarjetaMetrica({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: number }) {
  return (
    <article className="rounded-lg border border-rp-border bg-rp-surface p-4">
      <Icon className="text-rp-accent" size={20} />
      <span className="mt-3 block text-sm font-bold text-rp-muted">{label}</span>
      <strong className="mt-2 block text-3xl font-black text-rp-text">{value}</strong>
    </article>
  )
}
