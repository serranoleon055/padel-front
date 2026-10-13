import { Clock, Pencil, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { disponibilidadApi } from '@/features/tournaments/disponibilidadApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { formatearEnum } from '@/shared/lib/formatters'
import { describirRestriccion } from '@/shared/lib/restricciones'
import type { DisponibilidadPareja, RestriccionHoraria, TorneoDetalleResponse } from '@/shared/types/api'
import { Button } from '@/shared/ui/Button'
import { EditorRestricciones } from '@/shared/ui/EditorRestricciones'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { StatusMessage } from '@/shared/ui/StatusMessage'
import { useToast } from '@/shared/ui/Toast'

type Pareja = TorneoDetalleResponse['parejas'][number]

export function ParejasTab({ torneoId, fechaInicio, fechaFin, parejas, puedeInscribir, estadoTorneo, onOpenInscribir, onEditar, onEliminar, onRetirar }: {
    torneoId: number
    fechaInicio: string | null
    fechaFin: string | null
    parejas: Pareja[]
    puedeInscribir: boolean
    estadoTorneo: string | undefined
    onOpenInscribir: () => void
    onEditar: (pareja: Pareja) => void
    onEliminar: (pareja: { id: number; name: string }) => void
    onRetirar: (pareja: { id: number; name: string }) => void
}) {
    const { success: avisoExito } = useToast()
    // Cuándo no puede jugar cada pareja: viene aparte porque es un dato del panel, no
    // de la web pública.
    const [disponibilidad, setDisponibilidad] = useState<Map<number, DisponibilidadPareja>>(new Map())
    const [editando, setEditando] = useState<{ pareja: Pareja; restricciones: RestriccionHoraria[]; notas: string } | null>(null)
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const cargar = useCallback(() => {
        disponibilidadApi.listar(torneoId)
            .then((lista) => setDisponibilidad(new Map(lista.map((d) => [d.parejaId, d]))))
            .catch(() => setDisponibilidad(new Map()))
    }, [torneoId])

    useEffect(() => { cargar() }, [cargar])

    function abrir(pareja: Pareja) {
        const actual = disponibilidad.get(pareja.id)
        setError(null)
        setEditando({ pareja, restricciones: actual?.restricciones ?? [], notas: actual?.notas ?? '' })
    }

    async function guardar() {
        if (!editando) return
        setGuardando(true); setError(null)
        try {
            const nueva = await disponibilidadApi.actualizar(torneoId, editando.pareja.id, {
                restricciones: editando.restricciones,
                notas: editando.notas.trim() || null,
            })
            setDisponibilidad((actual) => new Map(actual).set(nueva.parejaId, nueva))
            avisoExito('Horarios guardados')
            setEditando(null)
        } catch (e: unknown) {
            setError(obtenerMensajeErrorApi(e))
        } finally {
            setGuardando(false)
        }
    }

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
                    <ResumenDisponibilidad disponibilidad={disponibilidad.get(pareja.id)} />
                    </div>
                    <div className="flex items-center gap-2">
                    {pareja.estado !== 'ACTIVA' && (
                    <StatusBadge tone={pareja.estado === 'CAMPEON' ? 'success' : 'neutral'}>
                        {formatearEnum(pareja.estado)}
                    </StatusBadge>
                    )}
                    <button onClick={() => abrir(pareja)} className="flex size-11 items-center justify-center rounded-md lg:size-8 text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent" title="Horarios en que no pueden jugar">
                        <Clock size={14} />
                    </button>
                    {puedeInscribir && (
                        <button onClick={() => onEditar(pareja)} className="flex size-11 items-center justify-center rounded-md lg:size-8 text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent" title="Editar pareja">
                        <Pencil size={14} />
                        </button>
                    )}
                    {puedeInscribir && (
                        <button onClick={() => onEliminar({ id: pareja.id, name: `${pareja.jugador1Nombre} / ${pareja.jugador2Nombre}` })} className="flex size-11 items-center justify-center rounded-md lg:size-8 text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger" title="Eliminar pareja">
                        <Trash2 size={14} />
                        </button>
                    )}
                    {(estadoTorneo === 'EN_CURSO' || estadoTorneo === 'SORTEADO') && (
                        <button onClick={() => onRetirar({ id: pareja.id, name: `${pareja.jugador1Nombre} / ${pareja.jugador2Nombre}` })} className="flex size-11 items-center justify-center rounded-md lg:size-8 text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger" title="Retirar pareja del torneo (genera W.O.)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        </button>
                    )}
                    </div>
                </div>
                </article>
            ))}
            </div>
        )}
        <Modal isOpen={Boolean(editando)} onClose={() => setEditando(null)} onSubmit={guardar} title="Cuándo no pueden jugar" size="lg">
            {editando && (
                <div className="flex flex-col gap-4">
                    <p className="text-sm font-bold text-rp-text">{editando.pareja.jugador1Nombre} / {editando.pareja.jugador2Nombre}</p>
                    {error && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{error}</p>}
                    <EditorRestricciones valor={editando.restricciones} onChange={(restricciones) => setEditando({ ...editando, restricciones })} fechaInicio={fechaInicio} fechaFin={fechaFin} />
                    <Input label="Otra aclaración" value={editando.notas} onChange={(e) => setEditando({ ...editando, notas: e.target.value })} maxLength={500} placeholder="Ej: si se puede, que no sea el primer turno" />
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setEditando(null)} disabled={guardando}>Cancelar</Button>
                        <Button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</Button>
                    </div>
                </div>
            )}
        </Modal>
        </div>
    )
}

function ResumenDisponibilidad({ disponibilidad }: { disponibilidad: DisponibilidadPareja | undefined }) {
    if (!disponibilidad || (disponibilidad.restricciones.length === 0 && !disponibilidad.notas)) {
        return <span className="mt-1 block text-xs text-rp-muted/70">Sin restricciones de horario</span>
    }
    return (
        <span className="mt-1 block text-xs text-rp-text">
            <b className="text-rp-danger">No pueden:</b> {disponibilidad.restricciones.map(describirRestriccion).join(' · ') || '—'}
            {disponibilidad.notas && <span className="block italic text-rp-muted">{disponibilidad.notas}</span>}
        </span>
    )
}
