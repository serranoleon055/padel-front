import { CalendarDays, Check, Clock, Pencil, Play, X } from 'lucide-react'
import { memo, useState } from 'react'

import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { formatearEstadoPartido, formatearFechaPartido, nombresPareja } from '@/shared/lib/formatters'
import { validarFormatoSets, validarMarcador } from '@/shared/lib/score'
import type { PartidoResponse } from '@/shared/types/api'
import { Button } from '@/shared/ui/Button'
import { NombreParejaApilado } from '@/shared/ui/NombreParejaApilado'
import { StatusBadge } from '@/shared/ui/StatusBadge'

import { EntradaSets } from './EntradaSets'

function tonoBadge(estado: string): 'live' | 'success' | 'neutral' {
    if (estado === 'EN_CURSO') return 'live'
    if (estado === 'FINALIZADO') return 'success'
    return 'neutral'
}

export const TarjetaPartidoAdmin = memo(function TarjetaPartidoAdmin({ partido, mejorDeSets, showResults, canSchedule, canEditResult, compacto = false, onStartMatch, onSubmitResult, onCorrectResult, onSchedule, onDeclareWo }: {
    partido: PartidoResponse
    mejorDeSets: number
    showResults: boolean
    canSchedule: boolean
    canEditResult: boolean
    compacto?: boolean
    onStartMatch: (id: number) => void
    onSubmitResult: (partido: PartidoResponse, marcador: string) => Promise<void>
    onCorrectResult: (partido: PartidoResponse, marcador: string) => Promise<void>
    onSchedule: (partido: PartidoResponse, fechaHora: string) => Promise<void>
    onDeclareWo: (partido: PartidoResponse) => void
}) {
    const esPendiente = partido.estado === 'PENDIENTE'
    const esEnCurso = partido.estado === 'EN_CURSO'
    const esFinalizado = partido.estado === 'FINALIZADO'
    const esTerminal = ['FINALIZADO', 'BYE', 'WALKOVER', 'RETIRO'].includes(partido.estado)
    const cargable = (esPendiente || esEnCurso) && showResults

    const [editando, setEditando] = useState(false)
    const [marcador, setMarcador] = useState('')
    const [resetKey, setResetKey] = useState(0)
    const [guardando, setGuardando] = useState(false)
    const [errorGuardar, setErrorGuardar] = useState<string | null>(null)

    const [programando, setProgramando] = useState(false)
    const [fecha, setFecha] = useState('')
    const [guardandoFecha, setGuardandoFecha] = useState(false)
    const [errorFecha, setErrorFecha] = useState<string | null>(null)

    const errorFormato = marcador.trim() ? validarFormatoSets(marcador, mejorDeSets) : null
    const ganadorLocal = partido.ganadorId != null && partido.ganadorId === partido.parejaLocalId
    const ganadorVisitante = partido.ganadorId != null && partido.ganadorId === partido.parejaVisitanteId
    const mostrarPlanilla = cargable || (esFinalizado && editando)
    const local = nombresPareja(partido, 'local')
    const visitante = nombresPareja(partido, 'visitante')

    async function guardarResultado() {
        const error = validarMarcador(marcador, mejorDeSets)
        if (error) { setErrorGuardar(error); return }
        setGuardando(true); setErrorGuardar(null)
        try {
            if (editando) await onCorrectResult(partido, marcador.trim())
            else await onSubmitResult(partido, marcador.trim())
            setEditando(false); setMarcador('')
        } catch (e: unknown) { setErrorGuardar(obtenerMensajeErrorApi(e)) }
        finally { setGuardando(false) }
    }

    function abrirEdicion() {
        setMarcador(partido.marcador ?? ''); setErrorGuardar(null); setEditando(true); setResetKey((k) => k + 1)
    }

    function cancelar() {
        setMarcador(''); setErrorGuardar(null); setEditando(false); setResetKey((k) => k + 1)
    }

    function abrirProgramacion() {
        setFecha(partido.fechaHoraProgramada ? partido.fechaHoraProgramada.slice(0, 16) : '')
        setErrorFecha(null); setProgramando(true)
    }

    async function guardarProgramacion() {
        if (!fecha) { setErrorFecha('Elegí la fecha y hora.'); return }
        setGuardandoFecha(true); setErrorFecha(null)
        try {
            await onSchedule(partido, fecha)
            setProgramando(false)
        } catch (e: unknown) { setErrorFecha(obtenerMensajeErrorApi(e)) }
        finally { setGuardandoFecha(false) }
    }

    return (
        <article className={`flex flex-col rounded-xl border border-rp-border bg-rp-surface/82 shadow-sm ${compacto ? 'gap-2.5 p-3' : 'gap-3 p-4'}`}>
            <div className="flex items-center justify-between gap-2">
                <StatusBadge tone={tonoBadge(partido.estado)}>{formatearEstadoPartido(partido.estado)}</StatusBadge>
                {(partido.fechaHora || partido.fechaHoraProgramada) && (
                    <span className="flex items-center gap-1 text-[11px] text-rp-muted">
                        <Clock size={11} />{formatearFechaPartido(partido)}
                        {partido.canchaNombre && <span>· {partido.canchaNombre}</span>}
                    </span>
                )}
            </div>

            {mostrarPlanilla ? (
                <div className="flex flex-col gap-2">
                    <EntradaSets
                        key={`${partido.id}-${editando}-${resetKey}`}
                        mejorDeSets={mejorDeSets}
                        valorInicial={marcador}
                        onChange={setMarcador}
                        localJugadores={local}
                        visitanteJugadores={visitante}
                    />
                    {errorFormato && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-xs font-bold text-rp-danger">{errorFormato}</p>}
                    {errorGuardar && !errorFormato && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-xs font-bold text-rp-danger">{errorGuardar}</p>}
                </div>
            ) : (
                <>
                    <div className="flex flex-col gap-1 text-sm">
                        <div className={`flex items-center justify-between gap-2 ${ganadorLocal ? 'font-black text-rp-accent' : 'font-bold text-rp-text'}`}>
                            <NombreParejaApilado jugadores={local} />
                            {ganadorLocal && <Check size={14} className="shrink-0" />}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.1em] text-rp-muted">vs</span>
                        <div className={`flex items-center justify-between gap-2 ${ganadorVisitante ? 'font-black text-rp-accent' : 'font-bold text-rp-text'}`}>
                            <NombreParejaApilado jugadores={visitante} />
                            {ganadorVisitante && <Check size={14} className="shrink-0" />}
                        </div>
                    </div>
                    {esFinalizado && partido.marcador && (
                        <p className="text-sm font-black text-rp-accent">{partido.marcador}</p>
                    )}
                </>
            )}

            {!esTerminal && canSchedule && programando && (
                <div className="flex flex-col gap-2 rounded-md border border-rp-border bg-rp-bg/55 p-2">
                    <input
                        type="datetime-local"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        className="rounded-md border border-rp-border bg-rp-bg px-3 py-2 text-sm text-rp-text focus:border-rp-accent focus:outline-none"
                    />
                    {errorFecha && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-xs font-bold text-rp-danger">{errorFecha}</p>}
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setProgramando(false)} disabled={guardandoFecha}>Cancelar</Button>
                        <Button size="sm" onClick={guardarProgramacion} disabled={guardandoFecha || !fecha}>{guardandoFecha ? 'Guardando...' : 'Guardar'}</Button>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-rp-border/60 pt-2.5">
                {!esTerminal && canSchedule && !programando && (
                    <Button variant="ghost" size="sm" onClick={abrirProgramacion}>
                        <CalendarDays size={13} />{partido.fechaHoraProgramada ? 'Reprogramar' : 'Programar'}
                    </Button>
                )}
                {esPendiente && showResults && (
                    <Button variant="ghost" size="sm" onClick={() => onStartMatch(partido.id)}>
                        <Play size={13} />Iniciar
                    </Button>
                )}
                {cargable && (
                    <>
                        <Button variant="ghost" size="sm" onClick={() => onDeclareWo(partido)}>W.O.</Button>
                        <Button variant="ghost" size="sm" onClick={cancelar} disabled={guardando || !marcador.trim()}>
                            <X size={13} />Cancelar
                        </Button>
                        <Button variant="subtle" size="sm" onClick={guardarResultado} disabled={guardando || !marcador.trim() || Boolean(errorFormato)}>
                            {guardando ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </>
                )}
                {esFinalizado && canEditResult && !editando && (
                    <Button variant="ghost" size="sm" onClick={abrirEdicion}>
                        <Pencil size={13} />Editar
                    </Button>
                )}
                {esFinalizado && editando && (
                    <>
                        <Button variant="ghost" size="sm" onClick={cancelar} disabled={guardando}>
                            <X size={13} />Cancelar
                        </Button>
                        <Button variant="subtle" size="sm" onClick={guardarResultado} disabled={guardando || !marcador.trim() || Boolean(errorFormato)}>
                            {guardando ? 'Guardando...' : 'Guardar corrección'}
                        </Button>
                    </>
                )}
            </div>
        </article>
    )
})
