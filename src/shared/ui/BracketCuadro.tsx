import type { ReactNode } from 'react'

import type { RondaCuadro } from '@/shared/lib/bracket'
import type { PartidoResponse } from '@/shared/types/api'

import './bracket.css'

export function BracketCuadro({ rondas, renderSlot, anchoColumna }: {
    rondas: RondaCuadro[]
    renderSlot: (partido: PartidoResponse | null, indicePartido: number) => ReactNode
    anchoColumna?: number
}) {
    return (
        <div className="td-bracket-v2">
            {rondas.map((ronda, indiceRonda) => {
                const tieneSaliente = indiceRonda < rondas.length - 1
                const tieneEntrante = indiceRonda > 0

                return (
                    <div key={ronda.tamano} className="td-bcol" style={anchoColumna ? { flex: `0 0 ${anchoColumna}px` } : undefined}>
                        <div className="td-bcol-label">{ronda.etiqueta}</div>
                        <div className="td-bcol-slots">
                            {ronda.partidos.map((partido, indicePartido) => (
                                <div
                                    key={partido?.id ?? `${ronda.tamano}-${indicePartido}`}
                                    className={`td-bslot${partido ? '' : ' is-empty'}`}
                                >
                                    {tieneEntrante && <span className="td-bconn-in" />}
                                    {renderSlot(partido, indicePartido)}
                                    {tieneSaliente && <span className={`td-bconn ${indicePartido % 2 === 0 ? 'bconn-top' : 'bconn-bot'}`} />}
                                </div>
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
