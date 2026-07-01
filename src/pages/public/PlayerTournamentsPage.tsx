import { useEffect, useState } from 'react'
import { useParams, NavLink } from 'react-router-dom'
import { ArrowLeft, Trophy } from 'lucide-react'

import { playersApi } from '@/features/players/playersApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { formatearFecha } from '@/shared/lib/formatters'
import type { JugadorHistorialResponse } from '@/shared/types/api'
import { StatusMessage } from '@/shared/ui/StatusMessage'

export default function PlayerTournamentsPage() {
  const { jugadorId } = useParams()
  const id = Number(jugadorId)

  const [historial, setHistorial] = useState<JugadorHistorialResponse | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!Number.isFinite(id)) return
    setCargando(true)
    playersApi.getHistorial(id)
      .then((datos) => { setHistorial(datos); setError(null) })
      .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
      .finally(() => setCargando(false))
  }, [id])

  if (cargando) return (
    <div className="flex min-h-[60svh] items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-2 border-rp-accent border-t-transparent" />
    </div>
  )
  if (error) return <StatusMessage type="error" title="Error" description={error} />
  if (!historial) return null

  const { jugador, torneos } = historial

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <NavLink to={`/jugadores/${id}`} className="mb-6 flex items-center gap-2 text-sm" style={{ color: 'var(--rp-muted-light)' }}>
        <ArrowLeft size={15} /> Volver al perfil
      </NavLink>

      <h1 className="flex items-center gap-2 text-2xl font-black" style={{ color: 'var(--rp-green-800)' }}>
        <Trophy size={20} /> Torneos de {jugador.nombre} {jugador.apellido}
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--rp-muted-light)' }}>
        {torneos.length} {torneos.length === 1 ? 'torneo jugado' : 'torneos jugados'}
      </p>

      {torneos.length > 0 ? (
        <div className="mt-6 space-y-2">
          {torneos.map((t) => (
            <div key={t.torneoId} className="flex items-center justify-between rounded-lg border px-4 py-3 transition-transform hover:-translate-y-0.5" style={{ borderColor: 'var(--rp-border-light)', background: '#fff' }}>
              <div>
                <NavLink to={`/torneos/${t.torneoId}`} className="font-bold" style={{ color: 'var(--rp-green-800)' }}>
                  {t.torneoNombre}
                </NavLink>
                <p className="text-xs" style={{ color: 'var(--rp-muted-light)' }}>
                  {t.categoriaNombre} · {formatearFecha(t.fechaInicio)}
                  {t.estado === 'FINALIZADO'
                    ? (t.mejorRonda !== '—' && !t.fueGanador ? ` · Hasta: ${t.mejorRonda}` : '')
                    : ' · En curso'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {t.fueGanador && <span className="flex items-center gap-1 text-xs font-black" style={{ color: 'var(--rp-gold)' }}><Trophy size={12} /> Campeón</span>}
                <span className="text-sm font-black" style={{ color: 'var(--rp-green-600)' }}>{t.puntosObtenidos} pts</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <StatusMessage type="empty" title="Sin torneos" description="Este jugador todavía no jugó torneos." />
        </div>
      )}
    </main>
  )
}
