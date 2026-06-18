import { useMemo } from 'react'

import type { PartidoResponse } from '@/shared/types/api'
import { StatusMessage } from '@/shared/ui/StatusMessage'

import { FilaPartido } from './FilaPartido'
import { GrupoPartidosColapsable } from './GrupoPartidosColapsable'

export function PartidosTab({ partidos, mostrarSorteo, showResults, canSchedule, onStartMatch, onLoadResult, onSchedule, onDeclareWo }: {
    partidos: PartidoResponse[]
    mostrarSorteo: boolean
    showResults: boolean
    canSchedule: boolean
    onStartMatch: (id: number) => void
    onLoadResult: (p: PartidoResponse) => void
    onSchedule: (p: PartidoResponse) => void
    onDeclareWo: (p: PartidoResponse) => void
}) {
    const partidosPorCategoria = useMemo(() => {
        const mapa = new Map<string, PartidoResponse[]>()
        for (const partido of partidos) {
            const clave = partido.categoriaNombre ?? 'Sin categoría'
            if (!mapa.has(clave)) mapa.set(clave, [])
            mapa.get(clave)!.push(partido)
        }
        return mapa
    }, [partidos])

    if (partidos.length === 0) {
        return <StatusMessage type="empty" title="No hay partidos" description={mostrarSorteo ? 'Generá el sorteo desde el encabezado.' : 'Los partidos se generan al sortear (estado INSCRIPCION).'} />
    }

    return (
        <div className="space-y-6">
        {Array.from(partidosPorCategoria.entries()).map(([nombreCat, partidosCat]) => {
            const partidosGruposFase = partidosCat.filter((partido) => partido.fase === 'GRUPOS')
            const eliminacion = partidosCat.filter((partido) => partido.fase === 'ELIMINACION')

            const porGrupo = partidosGruposFase.reduce<Record<string, PartidoResponse[]>>((acum, partido) => {
                const clave = partido.grupoNombre ?? 'Sin grupo'
                if (!acum[clave]) acum[clave] = []
                acum[clave].push(partido)
                return acum
            }, {})
            const ordenarPorEstado = (lista: PartidoResponse[]) =>
                [...lista].sort((a, b) => {
                    const orden: Record<string, number> = { PENDIENTE: 0, EN_CURSO: 1, BYE: 2, FINALIZADO: 3, WALKOVER: 3, RETIRO: 3 }
                    return (orden[a.estado] ?? 2) - (orden[b.estado] ?? 2)
                })

            const porJornada = (lista: PartidoResponse[]): Array<[number | null, PartidoResponse[]]> => {
                const mapa = new Map<number | null, PartidoResponse[]>()
                for (const partido of lista) {
                    const clave = partido.jornada ?? null
                    if (!mapa.has(clave)) mapa.set(clave, [])
                    mapa.get(clave)!.push(partido)
                }
                return Array.from(mapa.entries()).sort((a, b) => (a[0] ?? Infinity) - (b[0] ?? Infinity))
            }

            const porRonda = eliminacion.reduce<Record<string, PartidoResponse[]>>((acum, partido) => {
                const clave = partido.ronda ?? 'Eliminación'
                if (!acum[clave]) acum[clave] = []
                acum[clave].push(partido)
                return acum
            }, {})

            return (
            <div key={nombreCat}>
                <h3 className="mb-3 text-sm font-black uppercase tracking-[0.12em] text-rp-accent">{nombreCat}</h3>

                {Object.keys(porGrupo).length > 0 && (
                <div className="mb-4">
                    <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-rp-muted">Fase de grupos</h4>
                    <div className="space-y-3">
                    {Object.entries(porGrupo).map(([grupoNombre, partidosGrupo]) => {
                        const jornadas = porJornada(partidosGrupo)
                        const tieneJornadas = jornadas.some(([j]) => j !== null) && jornadas.length > 1
                        return (
                        <GrupoPartidosColapsable key={grupoNombre} title={grupoNombre} count={partidosGrupo.length}>
                            {tieneJornadas ? (
                                jornadas.map(([jornada, partidosJornada]) => (
                                    <div key={jornada ?? 'sin-fecha'} className="space-y-2">
                                        <p className="pt-1 text-xs font-black uppercase tracking-[0.1em] text-rp-muted">{jornada !== null ? `Fecha ${jornada}` : 'Sin fecha'}</p>
                                        {ordenarPorEstado(partidosJornada).map((partido) => (
                                        <FilaPartido key={partido.id} partido={partido} showResults={showResults} canSchedule={canSchedule} onStartMatch={onStartMatch} onLoadResult={onLoadResult} onSchedule={onSchedule} onDeclareWo={onDeclareWo} />
                                        ))}
                                    </div>
                                ))
                            ) : (
                                ordenarPorEstado(partidosGrupo).map((partido) => (
                                <FilaPartido key={partido.id} partido={partido} showResults={showResults} canSchedule={canSchedule} onStartMatch={onStartMatch} onLoadResult={onLoadResult} onSchedule={onSchedule} onDeclareWo={onDeclareWo} />
                                ))
                            )}
                        </GrupoPartidosColapsable>
                        )
                    })}
                    </div>
                </div>
                )}

                {Object.keys(porRonda).length > 0 && (
                <div>
                    <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-rp-muted">Eliminatorias</h4>
                    <div className="space-y-3">
                    {Object.entries(porRonda).map(([rondaNombre, partidosRonda]) => (
                        <GrupoPartidosColapsable key={rondaNombre} title={rondaNombre} count={partidosRonda.length}>
                            {ordenarPorEstado(partidosRonda).map((partido) => (
                            <FilaPartido key={partido.id} partido={partido} showResults={showResults} canSchedule={canSchedule} onStartMatch={onStartMatch} onLoadResult={onLoadResult} onSchedule={onSchedule} onDeclareWo={onDeclareWo} />
                            ))}
                        </GrupoPartidosColapsable>
                    ))}
                    </div>
                </div>
                )}
            </div>
            )
        })}
        </div>
    )
}
