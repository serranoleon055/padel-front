import { useEffect, useMemo, useState } from 'react'

import { construirRondasCuadro } from '@/shared/lib/bracket'
import type { PartidoResponse, TorneoDetalleResponse } from '@/shared/types/api'
import { BracketCuadro } from '@/shared/ui/BracketCuadro'
import { NavegadorFase } from '@/shared/ui/NavegadorFase'
import { StatusMessage } from '@/shared/ui/StatusMessage'

import { TarjetaPartidoAdmin } from './TarjetaPartidoAdmin'

type FaseVista = { clave: string; etiqueta: string; partidos: PartidoResponse[] }

const ORDEN_ESTADO: Record<string, number> = { PENDIENTE: 0, EN_CURSO: 1, BYE: 2, FINALIZADO: 3, WALKOVER: 3, RETIRO: 3 }

function ordenarPorEstado(lista: PartidoResponse[]) {
    return [...lista].sort((a, b) => (ORDEN_ESTADO[a.estado] ?? 2) - (ORDEN_ESTADO[b.estado] ?? 2) || a.id - b.id)
}

function construirFasesGrupos(partidos: PartidoResponse[], esLiga: boolean): FaseVista[] {
    const grupos = partidos.filter((partido) => partido.fase === 'GRUPOS')
    if (esLiga) {
        const porFecha = new Map<number | null, PartidoResponse[]>()
        for (const partido of grupos) {
            const clave = partido.jornada ?? null
            if (!porFecha.has(clave)) porFecha.set(clave, [])
            porFecha.get(clave)!.push(partido)
        }
        return Array.from(porFecha.entries())
            .sort((a, b) => (a[0] ?? Infinity) - (b[0] ?? Infinity))
            .map(([jornada, lista]) => ({ clave: `fecha-${jornada ?? 'sin'}`, etiqueta: jornada != null ? `Fecha ${jornada}` : 'Sin fecha', partidos: ordenarPorEstado(lista) }))
    }
    const porGrupo = new Map<string, PartidoResponse[]>()
    for (const partido of grupos) {
        const clave = partido.grupoNombre ?? 'Grupo'
        if (!porGrupo.has(clave)) porGrupo.set(clave, [])
        porGrupo.get(clave)!.push(partido)
    }
    return Array.from(porGrupo.keys()).sort((a, b) => a.localeCompare(b, 'es'))
        .map((nombre) => ({ clave: `grupo-${nombre}`, etiqueta: nombre, partidos: ordenarPorEstado(porGrupo.get(nombre)!) }))
}

export function PartidosTab({ partidos, parejas, torneo, mostrarSorteo, showResults, canSchedule, canEditResult, onStartMatch, onSubmitResult, onCorrectResult, onSchedule, onDeclareWo }: {
    partidos: PartidoResponse[]
    parejas: TorneoDetalleResponse['parejas']
    torneo: TorneoDetalleResponse['torneo']
    mostrarSorteo: boolean
    showResults: boolean
    canSchedule: boolean
    canEditResult: boolean
    onStartMatch: (id: number) => void
    onSubmitResult: (partido: PartidoResponse, marcador: string) => Promise<void>
    onCorrectResult: (partido: PartidoResponse, marcador: string) => Promise<void>
    onSchedule: (partido: PartidoResponse, fechaHora: string) => Promise<void>
    onDeclareWo: (partido: PartidoResponse) => void
}) {
    const esLiga = torneo.formato === 'LIGA'
    const mejorDeSets = torneo.mejorDeSets ?? 3
    const fasesGrupos = useMemo(() => construirFasesGrupos(partidos, esLiga), [partidos, esLiga])
    const eliminacion = useMemo(() => partidos.filter((partido) => partido.fase === 'ELIMINACION'), [partidos])
    const rondas = useMemo(() => (eliminacion.length > 0 ? construirRondasCuadro(eliminacion, parejas, torneo) : []), [eliminacion, parejas, torneo])

    const [indice, setIndice] = useState(0)
    useEffect(() => { setIndice((actual) => (actual >= fasesGrupos.length ? 0 : actual)) }, [fasesGrupos.length])

    if (partidos.length === 0) {
        return <StatusMessage type="empty" title="No hay partidos" description={mostrarSorteo ? 'Generá el sorteo desde el encabezado.' : 'Los partidos se generan al sortear (estado INSCRIPCION).'} />
    }

    const propsTarjeta = { mejorDeSets, showResults, canSchedule, canEditResult, onStartMatch, onSubmitResult, onCorrectResult, onSchedule, onDeclareWo }

    const total = fasesGrupos.length
    const indiceSeguro = Math.min(indice, Math.max(0, total - 1))
    const fase = fasesGrupos[indiceSeguro] ?? null

    return (
        <div className="space-y-8">
            {fase && (
                <div>
                    <div className="mb-4">
                        <NavegadorFase
                            etiqueta={fase.etiqueta}
                            indice={indiceSeguro}
                            total={total}
                            onAnterior={() => setIndice((indiceSeguro - 1 + total) % total)}
                            onSiguiente={() => setIndice((indiceSeguro + 1) % total)}
                        />
                    </div>
                    <div className="grid items-start gap-3 sm:grid-cols-2">
                        {fase.partidos.map((partido) => (
                            <TarjetaPartidoAdmin key={partido.id} partido={partido} {...propsTarjeta} />
                        ))}
                    </div>
                </div>
            )}

            {rondas.length > 0 && (
                <div>
                    <h4 className="mb-3 text-xs font-black uppercase tracking-[0.12em] text-rp-accent">Llaves</h4>
                    <BracketCuadro
                        rondas={rondas}
                        anchoColumna={340}
                        renderSlot={(partido) => partido
                            ? <TarjetaPartidoAdmin partido={partido} compacto {...propsTarjeta} />
                            : <article className="flex w-full items-center justify-center rounded-lg border border-dashed border-rp-border bg-rp-surface/40 p-3 text-xs text-rp-muted">Por definir</article>}
                    />
                </div>
            )}
        </div>
    )
}
