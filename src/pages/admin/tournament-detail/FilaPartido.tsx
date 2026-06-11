import { CalendarDays, ChevronDown, Clock, Play } from 'lucide-react'
import { memo, useState } from 'react'

import { formatearEnum, formatearEstadoPartido, formatearEtapaPartido, formatearFechaHora, formatearFechaPartido, formatearPareja } from '@/shared/lib/formatters'
import type { PartidoResponse } from '@/shared/types/api'
import { Button } from '@/shared/ui/Button'
import { StatusBadge } from '@/shared/ui/StatusBadge'

export const FilaPartido = memo(function FilaPartido({ partido, showResults, canSchedule, onStartMatch, onLoadResult, onSchedule, onDeclareWo }: {
    partido: PartidoResponse
    showResults: boolean
    canSchedule: boolean
    onStartMatch: (id: number) => void
    onLoadResult: (p: PartidoResponse) => void
    onSchedule: (p: PartidoResponse) => void
    onDeclareWo: (p: PartidoResponse) => void
}) {
    const [expandido, setExpandido] = useState(false)
    const esPendiente = partido.estado === 'PENDIENTE'
    const esEnCurso = partido.estado === 'EN_CURSO'
    const esTerminal = ['FINALIZADO', 'BYE', 'WALKOVER', 'RETIRO'].includes(partido.estado)
    const tonoBadge = esEnCurso ? 'live' : partido.estado === 'FINALIZADO' ? 'success' : partido.estado === 'BYE' || partido.estado === 'WALKOVER' || partido.estado === 'RETIRO' ? 'neutral' : 'neutral'
    return (
        <article className="rounded-lg border border-rp-border bg-rp-surface/82">
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5">
                <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={tonoBadge}>
                    {formatearEstadoPartido(partido.estado)}
                    </StatusBadge>
                    <span className="text-xs text-rp-muted">{formatearEtapaPartido(partido)}</span>
                    <span className="text-xs text-rp-muted">{partido.categoriaNombre}</span>
                </div>
                <p className="mt-3 truncate text-sm font-bold text-rp-text">{formatearPareja(partido, 'local')} vs {formatearPareja(partido, 'visitante')}</p>
                {partido.marcador && <p className="mt-2 text-sm font-black text-rp-accent">{partido.marcador}</p>}
                {!partido.marcador && (partido.fechaHoraProgramada || partido.fechaHora) && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-rp-muted">
                    <Clock size={11} />{formatearFechaPartido(partido)}
                    {partido.canchaNombre && <span>· {partido.canchaNombre}</span>}
                    </p>
                )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                {esPendiente && showResults && (
                    <button onClick={() => onStartMatch(partido.id)} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent" title="Iniciar partido">
                    <Play size={15} />
                    </button>
                )}
                {!esTerminal && canSchedule && (
                    <button onClick={() => onSchedule(partido)} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent" title="Programar fecha y hora">
                    <CalendarDays size={15} />
                    </button>
                )}
                {(esPendiente || esEnCurso) && showResults && (
                    <>
                    <Button size="sm" variant="subtle" onClick={() => onLoadResult(partido)}>
                    Resultado
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onDeclareWo(partido)}>
                    W.O.
                    </Button>
                    </>
                )}
                <button onClick={() => setExpandido(!expandido)} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2">
                    <ChevronDown size={15} className={`transition-transform ${expandido ? 'rotate-180' : ''}`} />
                </button>
                </div>
            </div>
            {expandido && (
                <div className="grid gap-2 border-t border-rp-border px-5 py-4 text-xs text-rp-muted sm:grid-cols-2">
                <span>Lugar: {partido.lugarNombre ?? '—'}</span>
                {partido.canchaNombre && <span>Cancha: {partido.canchaNombre}</span>}
                <span>Programado: {formatearFechaHora(partido.fechaHoraProgramada)}</span>
                <span>Jugado: {formatearFechaHora(partido.fechaHora)}</span>
                <span>Fase: {formatearEnum(partido.fase)}</span>
                {partido.ganadorNombre && <span className="font-bold text-rp-text">Ganador: {partido.ganadorNombre}</span>}
                </div>
            )}
        </article>
    )
})
