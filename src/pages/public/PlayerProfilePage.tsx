import { useEffect, useState } from 'react'
import { useParams, NavLink } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarDays, Trophy, Medal, TrendingUp, Users } from 'lucide-react'

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

  const { jugador, ranking, partidos, torneos, agenda } = historial

  const resultados = partidos
    .filter((p) => p.ganadorId != null)
    .map((p) => {
      const enLocal = p.jugadorLocal1Id === id || p.jugadorLocal2Id === id
      const parejaId = enLocal ? p.parejaLocalId : p.parejaVisitanteId
      return { partido: p, enLocal, gano: p.ganadorId === parejaId }
    })

  const victorias = resultados.filter((r) => r.gano).length
  const total = resultados.length
  const porcentajeVictorias = total > 0 ? Math.round((victorias / total) * 100) : 0

  let rachaActual = 0
  let rachaGanadora = false
  for (const r of resultados) {
    if (rachaActual === 0) { rachaGanadora = r.gano; rachaActual = 1 }
    else if (r.gano === rachaGanadora) rachaActual += 1
    else break
  }

  let mejorRacha = 0
  let corrida = 0
  for (let i = resultados.length - 1; i >= 0; i--) {
    if (resultados[i].gano) { corrida += 1; mejorRacha = Math.max(mejorRacha, corrida) }
    else corrida = 0
  }

  const mapaCompaneros = new Map<number, { nombre: string; jugados: number; ganados: number }>()
  for (const r of resultados) {
    const p = r.partido
    const companero1Id = r.enLocal ? p.jugadorLocal1Id : p.jugadorVisitante1Id
    const companero1Nombre = r.enLocal ? p.jugadorLocal1Nombre : p.jugadorVisitante1Nombre
    const companero2Id = r.enLocal ? p.jugadorLocal2Id : p.jugadorVisitante2Id
    const companero2Nombre = r.enLocal ? p.jugadorLocal2Nombre : p.jugadorVisitante2Nombre
    const companeroId = companero1Id === id ? companero2Id : companero1Id
    const companeroNombre = companero1Id === id ? companero2Nombre : companero1Nombre
    if (companeroId == null) continue
    const previo = mapaCompaneros.get(companeroId) ?? { nombre: companeroNombre ?? 'Compañero', jugados: 0, ganados: 0 }
    previo.jugados += 1
    if (r.gano) previo.ganados += 1
    mapaCompaneros.set(companeroId, previo)
  }
  const companeros = [...mapaCompaneros.entries()]
    .map(([companeroId, datos]) => ({ id: companeroId, ...datos }))
    .sort((a, b) => b.jugados - a.jugados)
    .slice(0, 5)

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
          <p className="mt-1 text-sm" style={{ color: 'var(--rp-muted-light)' }}>
            {formatearEnum(jugador.genero)} · {jugador.categoriaNombre ?? 'Sin categoría'}
            {jugador.posicionJuego ? ` · ${jugador.posicionJuego === 'DRIVE' ? 'Drive' : 'Revés'}` : ''}
          </p>
          <p className="text-xs" style={{ color: 'var(--rp-faint)' }}>Desde {formatearFecha(jugador.fechaRegistro)}</p>
        </div>
      </section>

      {/* Stats rápidas */}
      <p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--rp-muted-light)' }}>Totales en todas las categorías</p>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Torneos', value: torneos.length },
          { label: 'Partidos', value: total },
          { label: 'Victorias', value: victorias },
          { label: '% Victorias', value: `${porcentajeVictorias}%` },
          { label: 'Racha actual', value: total > 0 ? `${rachaActual}${rachaGanadora ? 'V' : 'D'}` : '—' },
          { label: 'Mejor racha', value: mejorRacha > 0 ? `${mejorRacha}V` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border p-4 text-center transition-transform hover:-translate-y-0.5" style={{ borderColor: 'var(--rp-border-light)', background: '#fff' }}>
            <strong className="block text-2xl font-black" style={{ color: 'var(--rp-gold)' }}>{value}</strong>
            <span className="mt-1 block text-xs font-bold" style={{ color: 'var(--rp-muted-light)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Agenda: próximos torneos */}
      {agenda.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-base font-black uppercase tracking-wider" style={{ color: 'var(--rp-green-700)' }}>
            <CalendarDays size={16} /> Próximos torneos
          </h2>
          <div className="space-y-2">
            {agenda.map((t) => (
              <NavLink key={t.torneoId} to={`/torneos/${t.torneoId}`} className="flex items-center justify-between rounded-lg border px-4 py-3 transition-transform hover:-translate-y-0.5" style={{ borderColor: 'var(--rp-border-light)', background: '#fff' }}>
                <div>
                  <span className="font-bold" style={{ color: 'var(--rp-green-800)' }}>{t.torneoNombre}</span>
                  <p className="text-xs" style={{ color: 'var(--rp-muted-light)' }}>
                    {t.categoriaNombre}{t.fechaInicio ? ` · ${formatearFecha(t.fechaInicio)}` : ''}
                  </p>
                </div>
                <span className="rounded-full px-3 py-1 text-xs font-black" style={{ background: 'var(--rp-green-800)', color: 'var(--rp-pale)' }}>
                  {formatearEnum(t.estado ?? '')}
                </span>
              </NavLink>
            ))}
          </div>
        </section>
      )}

      {/* Ranking actual */}
      {ranking.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-base font-black uppercase tracking-wider" style={{ color: 'var(--rp-green-700)' }}>
            <TrendingUp size={16} /> Ranking actual
          </h2>
          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--rp-border-light)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs" style={{ borderColor: 'var(--rp-border-light)', background: 'var(--rp-green-800)', color: 'var(--rp-pale)' }}>
                  <th className="px-4 py-2">Categoría</th>
                  <th className="px-4 py-2 text-center">Pos.</th>
                  <th className="px-4 py-2 text-center">Puntos</th>
                  <th className="px-4 py-2 text-center">Torneos</th>
                  <th className="px-4 py-2 text-center">V-D</th>
                  <th className="px-4 py-2 text-center">Tendencia</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r) => (
                  <tr key={r.categoriaId} className="border-b last:border-0" style={{ borderColor: 'var(--rp-border-light)', background: '#fff' }}>
                    <td className="px-4 py-3 font-bold" style={{ color: 'var(--rp-green-800)' }}>{r.categoriaNombre}</td>
                    <td className="px-4 py-3 text-center font-black" style={{ color: 'var(--rp-gold)' }}>#{r.posicion}</td>
                    <td className="px-4 py-3 text-center font-bold" style={{ color: 'var(--rp-ink)' }}>{r.puntosTotales}</td>
                    <td className="px-4 py-3 text-center" style={{ color: 'var(--rp-muted-light)' }}>{r.torneosJugados}</td>
                    <td className="px-4 py-3 text-center font-bold" style={{ color: 'var(--rp-ink)' }}>{r.victorias}-{r.derrotas}</td>
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

      {/* Compañeros frecuentes */}
      {companeros.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-base font-black uppercase tracking-wider" style={{ color: 'var(--rp-green-700)' }}>
            <Users size={16} /> Compañeros frecuentes
          </h2>
          <div className="space-y-2">
            {companeros.map((companero) => {
              const porcentaje = companero.jugados > 0 ? Math.round((companero.ganados / companero.jugados) * 100) : 0
              return (
                <div key={companero.id} className="flex items-center justify-between rounded-lg border px-4 py-3 transition-transform hover:-translate-y-0.5" style={{ borderColor: 'var(--rp-border-light)', background: '#fff' }}>
                  <NavLink to={`/jugadores/${companero.id}`} className="font-bold" style={{ color: 'var(--rp-green-800)' }}>{companero.nombre}</NavLink>
                  <div className="flex items-center gap-4 text-sm">
                    <span style={{ color: 'var(--rp-muted-light)' }}>{companero.jugados} {companero.jugados === 1 ? 'partido' : 'partidos'}</span>
                    <span className="font-black" style={{ color: 'var(--rp-green-600)' }}>{companero.ganados}V · {companero.jugados - companero.ganados}D</span>
                    <span className="font-black" style={{ color: 'var(--rp-gold)' }}>{porcentaje}%</span>
                  </div>
                </div>
              )
            })}
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
            {torneos.slice(0, 5).map((t) => (
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
          {torneos.length > 5 && (
            <NavLink
              to={`/jugadores/${id}/torneos`}
              className="mt-4 flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-black uppercase tracking-wider transition-transform hover:-translate-y-0.5"
              style={{ borderColor: 'var(--rp-green-600)', color: 'var(--rp-green-700)', background: '#fff' }}
            >
              Ver todos los torneos ({torneos.length})
              <ArrowRight size={15} />
            </NavLink>
          )}
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
