import { BarChart3, CalendarClock, Percent, TrendingUp, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { placesApi } from '@/features/catalog/catalogApi'
import { estadisticasApi } from '@/features/estadisticas/estadisticasApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { formatearMoneda } from '@/shared/lib/formatters'
import type { EstadisticasResponse, LugarResponse } from '@/shared/types/api'
import { StatusMessage } from '@/shared/ui/StatusMessage'

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function etiquetaMes(mes: string) {
  const [anio, numero] = mes.split('-')
  return `${MESES[Number(numero) - 1] ?? ''} ${anio.slice(2)}`
}

export default function EstadisticasPage() {
  const [lugares, setLugares] = useState<LugarResponse[]>([])
  const [lugarId, setLugarId] = useState<number | null>(null)
  const [datos, setDatos] = useState<EstadisticasResponse | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    placesApi.getAll().then(setLugares).catch(() => {})
  }, [])

  useEffect(() => {
    setCargando(true)
    estadisticasApi.obtener(lugarId ?? undefined)
      .then((d) => { setDatos(d); setError(null) })
      .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
      .finally(() => setCargando(false))
  }, [lugarId])

  const rangoHoras = useMemo(() => {
    if (!datos || datos.heatmap.length === 0) return [] as number[]
    const horas = datos.heatmap.map((f) => f.hora)
    const min = Math.min(...horas)
    const max = Math.max(...horas)
    return Array.from({ length: max - min + 1 }, (_, i) => min + i)
  }, [datos])

  const heatmapMapa = useMemo(() => {
    const mapa = new Map<string, number>()
    datos?.heatmap.forEach((f) => mapa.set(`${f.diaSemana}-${f.hora}`, f.cantidad))
    return mapa
  }, [datos])

  const maxHeatmap = useMemo(() => Math.max(1, ...(datos?.heatmap.map((f) => f.cantidad) ?? [1])), [datos])
  const maxCancha = useMemo(() => Math.max(1, ...(datos?.canchasMasUsadas.map((c) => c.reservas) ?? [1])), [datos])
  const maxCategoria = useMemo(() => Math.max(1, ...(datos?.categoriasDemandadas.map((c) => c.inscriptos) ?? [1])), [datos])
  const maxIngreso = useMemo(
    () => Math.max(1, ...(datos?.ingresosPorMes.flatMap((m) => [m.turnos, m.inscripciones]) ?? [1])),
    [datos],
  )

  return (
    <section className="admin-page">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-rp-accent">Admin</p>
      <h1 className="mt-2 text-3xl font-black text-rp-text sm:text-5xl">Estadísticas</h1>
      <p className="mt-2 text-sm text-rp-muted">Inteligencia de negocio de los últimos 6 meses.</p>

      <div className="mt-4 flex flex-wrap gap-1 rounded-lg border border-rp-border bg-rp-surface/82 p-1">
        <button
          type="button"
          onClick={() => setLugarId(null)}
          className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-bold transition ${lugarId === null ? 'bg-rp-surface-2 text-rp-accent' : 'text-rp-muted hover:text-rp-text'}`}
        >
          Todas las sedes
        </button>
        {lugares.map((lugar) => (
          <button
            key={lugar.id}
            type="button"
            onClick={() => setLugarId(lugar.id)}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-bold transition ${lugarId === lugar.id ? 'bg-rp-surface-2 text-rp-accent' : 'text-rp-muted hover:text-rp-text'}`}
          >
            {lugar.nombre}
          </button>
        ))}
      </div>

      {cargando && !datos ? (
        <div className="mt-6"><StatusMessage type="loading" title="Cargando estadísticas..." /></div>
      ) : error ? (
        <div className="mt-6"><StatusMessage type="error" title="Error al cargar" description={error} /></div>
      ) : !datos ? null : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Panel titulo="Ingresos por mes" icono={TrendingUp}>
            <div className="flex items-end gap-4" style={{ height: 160 }}>
              {datos.ingresosPorMes.map((mes) => (
                <div key={mes.mes} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <div className="flex h-full w-full items-end justify-center gap-1">
                    <div className="w-1/2 rounded-t bg-rp-accent/70" style={{ height: `${Math.max(2, (mes.turnos / maxIngreso) * 130)}px` }} title={`Turnos ${formatearMoneda(mes.turnos)}`} />
                    <div className="w-1/2 rounded-t bg-rp-amber/70" style={{ height: `${Math.max(2, (mes.inscripciones / maxIngreso) * 130)}px` }} title={`Inscripciones ${formatearMoneda(mes.inscripciones)}`} />
                  </div>
                  <span className="text-[10px] font-bold uppercase text-rp-muted">{etiquetaMes(mes.mes)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-4 text-xs font-bold text-rp-muted">
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-rp-accent/70" />Turnos</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-rp-amber/70" />Inscripciones</span>
            </div>
          </Panel>

          <Panel titulo="Tasa de cancelación" icono={Percent}>
            <div className="flex h-full flex-col justify-center">
              <p className="text-5xl font-black text-rp-text">{Math.round(datos.tasaCancelacion * 100)}%</p>
              <p className="mt-2 text-sm text-rp-muted">
                {datos.reservasCanceladas} de {datos.reservasTotales} turnos se cancelaron, rechazaron o expiraron.
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-rp-surface-2">
                <div className="h-full rounded-full bg-rp-danger" style={{ width: `${Math.min(100, datos.tasaCancelacion * 100)}%` }} />
              </div>
            </div>
          </Panel>

          <Panel titulo="Ocupación por día y hora" icono={CalendarClock} className="lg:col-span-2">
            {rangoHoras.length === 0 ? (
              <p className="py-6 text-center text-sm text-rp-muted">Sin turnos registrados en el período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="border-separate" style={{ borderSpacing: 3 }}>
                  <thead>
                    <tr>
                      <th className="w-10" />
                      {rangoHoras.map((hora) => (
                        <th key={hora} className="text-[10px] font-bold text-rp-muted">{hora}h</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DIAS.map((dia, indice) => (
                      <tr key={dia}>
                        <td className="pr-2 text-right text-[11px] font-bold text-rp-muted">{dia}</td>
                        {rangoHoras.map((hora) => {
                          const cantidad = heatmapMapa.get(`${indice + 1}-${hora}`) ?? 0
                          const intensidad = cantidad > 0 ? 0.15 + 0.85 * (cantidad / maxHeatmap) : 0
                          return (
                            <td key={hora}>
                              <div
                                className="flex size-7 items-center justify-center rounded text-[10px] font-bold"
                                style={{
                                  background: cantidad > 0 ? `color-mix(in srgb, var(--rp-accent) ${Math.round(intensidad * 100)}%, transparent)` : 'var(--rp-surface-2)',
                                  color: intensidad > 0.55 ? 'var(--rp-bg)' : 'var(--rp-muted)',
                                }}
                                title={`${dia} ${hora}:00 — ${cantidad} turno${cantidad === 1 ? '' : 's'}`}
                              >
                                {cantidad > 0 ? cantidad : ''}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel titulo="Canchas más usadas" icono={BarChart3}>
            {datos.canchasMasUsadas.length === 0 ? (
              <p className="py-4 text-center text-sm text-rp-muted">Sin datos todavía.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {datos.canchasMasUsadas.map((cancha) => (
                  <li key={cancha.canchaNombre}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-bold text-rp-text">{cancha.canchaNombre}</span>
                      <span className="font-black text-rp-accent">{cancha.reservas}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-rp-surface-2">
                      <div className="h-full rounded-full bg-rp-accent/70" style={{ width: `${(cancha.reservas / maxCancha) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel titulo="Categorías más demandadas" icono={BarChart3}>
            {datos.categoriasDemandadas.length === 0 ? (
              <p className="py-4 text-center text-sm text-rp-muted">Sin inscripciones aprobadas todavía.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {datos.categoriasDemandadas.map((categoria) => (
                  <li key={categoria.categoriaNombre}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-bold text-rp-text">{categoria.categoriaNombre}</span>
                      <span className="font-black text-rp-accent">{categoria.inscriptos}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-rp-surface-2">
                      <div className="h-full rounded-full bg-rp-amber/70" style={{ width: `${(categoria.inscriptos / maxCategoria) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel titulo="Embudo de torneos" icono={Trophy} className="lg:col-span-2">
            {datos.embudoTorneos.length === 0 ? (
              <p className="py-4 text-center text-sm text-rp-muted">No hay torneos abiertos.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {datos.embudoTorneos.map((torneo) => {
                  const porcentaje = torneo.cupo && torneo.cupo > 0 ? Math.min(100, (torneo.inscriptos / torneo.cupo) * 100) : 0
                  return (
                    <li key={torneo.torneoId} className="rounded-md border border-rp-border bg-rp-bg/40 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-bold text-rp-text">{torneo.torneoNombre}</span>
                        <span className="text-sm font-black text-rp-accent">{formatearMoneda(torneo.ingresos)}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-rp-surface-2">
                          <div className="h-full rounded-full bg-rp-accent/70" style={{ width: `${porcentaje}%` }} />
                        </div>
                        <span className="whitespace-nowrap text-xs font-bold text-rp-muted">
                          {torneo.inscriptos}{torneo.cupo ? ` / ${torneo.cupo}` : ''} parejas
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </section>
  )
}

function Panel({ titulo, icono: Icono, children, className }: { titulo: string; icono: typeof Trophy; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-rp-border bg-rp-surface/82 p-4 ${className ?? ''}`}>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-rp-accent">
        <Icono size={15} />{titulo}
      </h3>
      {children}
    </div>
  )
}
