import { Pencil, Plus, Trash2 } from 'lucide-react'

import { formatearEnum } from '@/shared/lib/formatters'
import type { TorneoDetalleResponse } from '@/shared/types/api'
import { Button } from '@/shared/ui/Button'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { StatusMessage } from '@/shared/ui/StatusMessage'

type Pareja = TorneoDetalleResponse['parejas'][number]

export function ParejasTab({ parejas, puedeInscribir, estadoTorneo, onOpenInscribir, onEditar, onEliminar, onRetirar }: {
    parejas: Pareja[]
    puedeInscribir: boolean
    estadoTorneo: string | undefined
    onOpenInscribir: () => void
    onEditar: (pareja: Pareja) => void
    onEliminar: (pareja: { id: number; name: string }) => void
    onRetirar: (pareja: { id: number; name: string }) => void
}) {
    return (
        <div className="mt-4">
        {puedeInscribir && (
            <div className="mb-4 flex justify-end">
            <Button size="sm" onClick={onOpenInscribir}>
                <Plus size={16} />Inscribir pareja
            </Button>
            </div>
        )}
        {parejas.length === 0 ? (
            <StatusMessage type="empty" title="No hay parejas" description={puedeInscribir ? 'Inscribí parejas con el botón.' : 'Requiere estado INSCRIPCION.'} />
        ) : (
            <div className="grid gap-3 sm:grid-cols-2">
            {parejas.map((pareja) => (
                <article key={pareja.id} className="rounded-lg border border-rp-border bg-rp-surface/82 p-5">
                <div className="flex items-start justify-between gap-3">
                    <div>
                    <p className="text-sm font-black text-rp-text">{pareja.jugador1Nombre} / {pareja.jugador2Nombre}</p>
                    <p className="mt-1 text-xs text-rp-muted">{pareja.categoriaNombre}</p>
                    {pareja.esCabezaDeSerie && <span className="mt-1 block text-xs font-bold text-rp-accent">Cabeza de serie</span>}
                    </div>
                    <div className="flex items-center gap-2">
                    <StatusBadge tone={pareja.estado === 'CAMPEON' ? 'success' : pareja.estado === 'ELIMINADA' ? 'neutral' : 'warning'}>
                        {formatearEnum(pareja.estado)}
                    </StatusBadge>
                    {puedeInscribir && (
                        <button onClick={() => onEditar(pareja)} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent" title="Editar pareja">
                        <Pencil size={14} />
                        </button>
                    )}
                    {puedeInscribir && (
                        <button onClick={() => onEliminar({ id: pareja.id, name: `${pareja.jugador1Nombre} / ${pareja.jugador2Nombre}` })} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger" title="Eliminar pareja">
                        <Trash2 size={14} />
                        </button>
                    )}
                    {(estadoTorneo === 'EN_CURSO' || estadoTorneo === 'SORTEADO') && (
                        <button onClick={() => onRetirar({ id: pareja.id, name: `${pareja.jugador1Nombre} / ${pareja.jugador2Nombre}` })} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger" title="Retirar pareja del torneo (genera W.O.)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        </button>
                    )}
                    </div>
                </div>
                </article>
            ))}
            </div>
        )}
        </div>
    )
}
