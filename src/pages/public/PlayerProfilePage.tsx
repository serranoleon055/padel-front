import { useEffect, useState } from 'react'
import { useParams, NavLink } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Trophy, Medal, TrendingUp } from 'lucide-react'

import { playersApi } from '@/features/players/playersApi'
import { resolveApiAssetUrl } from '@/shared/api/apiClient'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { formatearFecha, formatearEnum } from '@/shared/lib/formatters'
import type { JugadorHistorialResponse } from '@/shared/types/api'
import { StatusMessage } from '@/shared/ui/StatusMessage'
import { TarjetaPartidoJugador } from '@/pages/public/components/TarjetaPartidoJugador'

export default function PlayerProfilePage() {
  const { jugadorId } = useParams()
  const id = Number(jugadorId)

  const [historial, setHistorial] = useState<JugadorHistorialResponse | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!Number.isFinite(id)) return
    setCargando(true)
    playersApi.getHistorial(id)
      .then((h) => { setHistorial(h); setError(null) })
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

  const { jugador, ranking, partidos, torneos } = historial
  const victorias = partidos.filter((p) => {
    const esJugadorLocal = p.jugadorLocal1Id === id || p.jugadorLocal2Id === id
    const esJugadorVisitante = p.jugadorVisitante1Id === id || p.jugadorVisitante2Id === id
    return (esJugadorLocal && p.ganadorId === p.parejaLocalId) || (esJugadorVisitante && p.ganadorId === p.parejaVisitanteId)
  }).length
  const total = partidos.length
  const porcentajeVictorias = total > 0 ? Math.round((victorias / total) * 100) : 0
  const fotoUrl = resolveApiAssetUrl(jugador.fotoUrl)

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Encabezado */}
      <NavLink to="/ranking" className="mb-6 flex items-center gap-2 text-sm" style={{ color: 'var(--rp-muted-light)' }}>
        <ArrowLeft size={15} /> Volver al ranking
      </NavLink>

      <section className="mb-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        {fotoUrl ? (
          <img src={fotoUrl} alt={`${jugador.nombre} ${jugador.apellido}`} className="size-24 rounded-full object-cover" style={{ border: '3px solid var(--rp-gold)' }} />
        ) : (
          <div className="flex size-24 items-center justify-center rounded-full text-3xl font-black" style={{ background: 'var(--rp-green-800)', color: 'var(--rp-gold)' }}>
            {jugador.nombre?.[0]}{jugador.apellido?.[0]}
          </div>
        )}
        <div>
          <h1 className="text-3xl font-black" style={{ color: 'var(--rp-green-800)' }}>{jugador.nombre} {jugador.apellido}</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--rp-muted-light)' }}>{formatearEnum(jugador.genero)} · {jugador.categoriaNombre ?? 'Sin categoría'}</p>
          <p className="text-xs" style={{ color: 'var(--rp-faint)' }}>Desde {formatearFecha(jugador.fechaRegistro)}</p>
        </div>
      </section>

      {/* Stats rápidas */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Torneos', value: torneos.length },
          { label: 'Partidos', value: total },
          { label: 'Victorias', value: victorias },
          { label: '% Victorias', value: `${porcentajeVictorias}%` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border p-4 text-center transition-transform hover:-translate-y-0.5" style={{ borderColor: 'var(--rp-border-light)', background: '#fff' }}>
            <strong className="block text-2xl font-black" style={{ color: 'var(--rp-gold)' }}>{value}</strong>
            <span className="mt-1 block text-xs font-bold" style={{ color: 'var(--rp-muted-light)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Ranking actual */}
      {ranking.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-base font-black uppercase tracking-wider" style={{ color: 'var(--rp-green-700)' }}>
            <TrendingUp size={16} /> Ranking actual
          </h2>
          <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--rp-border-light)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs" style={{ borderColor: 'var(--rp-border-light)', background: 'var(--rp-green-800)', color: 'var(--rp-pale)' }}>
                  <th className="px-4 py-2">Categoría</th>
                  <th className="px-4 py-2 text-center">Pos.</th>
                  <th className="px-4 py-2 text-center">Puntos</th>
                  <th className="px-4 py-2 text-center">Tendencia</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r) => (
                  <tr key={r.categoriaId} className="border-b last:border-0" style={{ borderColor: 'var(--rp-border-light)', background: '#fff' }}>
                    <td className="px-4 py-3 font-bold" style={{ color: 'var(--rp-green-800)' }}>{r.categoriaNombre}</td>
                    <td className="px-4 py-3 text-center font-black" style={{ color: 'var(--rp-gold)' }}>#{r.posicion}</td>
                    <td className="px-4 py-3 text-center font-bold" style={{ color: 'var(--rp-ink)' }}>{r.puntosTotales}</td>
                    <td className="px-4 py-3 text-center text-sm font-bold">
                      <span style={{ color: r.tendencia.startsWith('+') ? 'var(--rp-green-600)' : r.tendencia.startsWith('-') ? '#c0392b' : 'var(--rp-muted-light)' }}>
                        {r.tendencia}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Historial de torneos */}
      {torneos.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-base font-black uppercase tracking-wider" style={{ color: 'var(--rp-green-700)' }}>
            <Trophy size={16} /> Torneos
          </h2>
          <div className="space-y-2">
            {torneos.map((t) => (
              <div key={t.torneoId} className="flex items-center justify-between rounded-lg border px-4 py-3 transition-transform hover:-translate-y-0.5" style={{ borderColor: 'var(--rp-border-light)', background: '#fff' }}>
                <div>
                  <NavLink to={`/torneos/${t.torneoId}`} className="font-bold" style={{ color: 'var(--rp-green-800)' }}>
                    {t.torneoNombre}
                  </NavLink>
                  <p className="text-xs" style={{ color: 'var(--rp-muted-light)' }}>
                    {t.categoriaNombre} · {formatearFecha(t.fechaInicio)}
                    {t.mejorRonda !== '—' && ` · Hasta: ${t.mejorRonda}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {t.fueGanador && <span className="flex items-center gap-1 text-xs font-black" style={{ color: 'var(--rp-gold)' }}><Trophy size={12} /> Campeón</span>}
                  <span className="text-sm font-black" style={{ color: 'var(--rp-green-600)' }}>{t.puntosObtenidos} pts</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Últimos partidos */}
      {partidos.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-black uppercase tracking-wider" style={{ color: 'var(--rp-green-700)' }}>
            <Medal size={16} /> Últimos partidos
          </h2>
          <div className="space-y-2">
            {partidos.slice(0, 5).map((p) => (
              <TarjetaPartidoJugador key={p.id} partido={p} jugadorId={id} />
            ))}
          </div>
          {partidos.length > 5 && (
            <NavLink
              to={`/jugadores/${id}/partidos`}
              className="mt-4 flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-black uppercase tracking-wider transition-transform hover:-translate-y-0.5"
              style={{ borderColor: 'var(--rp-green-600)', color: 'var(--rp-green-700)', background: '#fff' }}
            >
              Ver todos los partidos ({partidos.length})
              <ArrowRight size={15} />
            </NavLink>
          )}
        </section>
      )}

      {torneos.length === 0 && partidos.length === 0 && (
        <StatusMessage type="empty" title="Sin historial" description="Este jugador todavía no tiene partidos registrados." />
      )}
    </main>
  )
}
