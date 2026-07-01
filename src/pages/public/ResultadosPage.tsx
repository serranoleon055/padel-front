import { ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'

import { tournamentsApi } from '@/features/tournaments/tournamentsApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { formatearEnum } from '@/shared/lib/formatters'
import type { EstadoTorneo, TorneoResponse } from '@/shared/types/api'
import { StatusMessage } from '@/shared/ui/StatusMessage'

const ESTADOS_VISIBLES: EstadoTorneo[] = ['EN_CURSO', 'FINALIZADO']

export default function ResultadosPage() {
  const [torneos, setTorneos] = useState<TorneoResponse[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    tournamentsApi.getAll()
      .then((datos) => {
        setTorneos(datos.filter((torneo) => ESTADOS_VISIBLES.includes(torneo.estado)).sort((a, b) => b.id - a.id))
        setError(null)
      })
      .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
      .finally(() => setCargando(false))
  }, [])

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-black text-rp-text sm:text-4xl">Resultados</h1>
      <p className="mt-2 text-sm text-rp-muted">Elegí un torneo para ver todos sus resultados.</p>

      <div className="mt-8 flex flex-col gap-3">
        {cargando ? (
          <StatusMessage type="loading" title="Cargando torneos..." />
        ) : error ? (
          <StatusMessage type="error" title="Error" description={error} />
        ) : torneos.length === 0 ? (
          <StatusMessage type="empty" title="Sin torneos" description="Todavía no hay torneos en curso o finalizados." />
        ) : (
          torneos.map((torneo) => (
            <NavLink
              key={torneo.id}
              to={`/torneos/${torneo.id}/resultados`}
              className="flex items-center justify-between gap-3 rounded-lg border border-rp-border bg-rp-surface/82 p-4 transition hover:border-rp-accent/60"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-rp-text">{torneo.nombre}</p>
                <p className="text-xs text-rp-muted">{formatearEnum(torneo.estado)} · {formatearEnum(torneo.formato)} · {torneo.partidosFinalizados ?? 0} jugados</p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-rp-muted" />
            </NavLink>
          ))
        )}
      </div>
    </section>
  )
}
