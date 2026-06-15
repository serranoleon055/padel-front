import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { seasonsApi } from '@/features/catalog/catalogApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { useToast } from '@/shared/ui/Toast'
import { formatearFecha } from '@/shared/lib/formatters'
import { coincidePrefijoNombre } from '@/shared/lib/tournamentView'
import type { TemporadaRequest, TemporadaResponse } from '@/shared/types/api'
import { AdminPageHeader } from '@/shared/ui/AdminPageHeader'
import { AdminTable, type Column } from '@/shared/ui/AdminTable'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Pagination } from '@/shared/ui/Pagination'
import { StatusBadge } from '@/shared/ui/StatusBadge'

const TAMANO_PAGINA = 8
const VACIO: TemporadaRequest = { nombre: '', fechaInicio: '', fechaFin: null, activa: false }

export default function SeasonsPage() {
    const [elementos, setElementos] = useState<TemporadaResponse[]>([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { success: avisoExito } = useToast()
    const [modalAbierto, setModalAbierto] = useState(false)
    const [objetivoEdicion, setObjetivoEdicion] = useState<TemporadaResponse | null>(null)
    const [formulario, setFormulario] = useState<TemporadaRequest>(VACIO)
    const [errorFormulario, setErrorFormulario] = useState<string | null>(null)
    const [guardando, setGuardando] = useState(false)
    const [objetivoEliminar, setObjetivoEliminar] = useState<TemporadaResponse | null>(null)
    const [eliminando, setEliminando] = useState(false)

    const [idsSeleccionados, setIdsSeleccionados] = useState<Set<number>>(new Set())
    const [eliminarLoteAbierto, setEliminarLoteAbierto] = useState(false)
    const [eliminandoLote, setEliminandoLote] = useState(false)

    const [busqueda, setBusqueda] = useState('')
    const [filtroActiva, setFiltroActiva] = useState<string>('')
    const [pagina, setPagina] = useState(1)

    const refScrollY = useRef(0)

    function cargar() {
        refScrollY.current = window.scrollY
        setCargando(true)
        seasonsApi.getAll()
        .then((datos) => { setElementos(datos); setError(null) })
        .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
        .finally(() => {
            setCargando(false)
            requestAnimationFrame(() => window.scrollTo(0, refScrollY.current))
        })
    }
    useEffect(cargar, [])

    useEffect(() => {
        setPagina(1)
    }, [busqueda, filtroActiva])

    const filtrados = useMemo(() => elementos.filter((temporada) => {
        const coincideNombre = coincidePrefijoNombre(temporada.nombre, busqueda)
        const coincideActiva = !filtroActiva || (filtroActiva === 'true' ? temporada.activa : !temporada.activa)
        return coincideNombre && coincideActiva
    }).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })), [filtroActiva, elementos, busqueda])

    const paginados = filtrados.slice((pagina - 1) * TAMANO_PAGINA, pagina * TAMANO_PAGINA)

    function abrirCrear() { setObjetivoEdicion(null); setFormulario(VACIO); setErrorFormulario(null); setModalAbierto(true) }
    function abrirEditar(temporada: TemporadaResponse) { setObjetivoEdicion(temporada); setFormulario({ nombre: temporada.nombre, fechaInicio: temporada.fechaInicio, fechaFin: temporada.fechaFin ?? null, activa: temporada.activa }); setErrorFormulario(null); setModalAbierto(true) }
    function cerrarModal() { setModalAbierto(false); setErrorFormulario(null) }

    async function manejarGuardar() {
        if (!formulario.nombre.trim() || !formulario.fechaInicio) { setErrorFormulario('Nombre y fecha de inicio son obligatorios.'); return }
        setGuardando(true); setErrorFormulario(null)
        try {
        if (objetivoEdicion) await seasonsApi.update(objetivoEdicion.id, formulario)
        else await seasonsApi.create(formulario)
        avisoExito(objetivoEdicion ? 'Temporada actualizada' : 'Temporada creada')
        cerrarModal(); cargar()
        } catch (e: unknown) { setErrorFormulario(obtenerMensajeErrorApi(e)) }
        finally { setGuardando(false) }
    }

    async function manejarEliminar() {
        if (!objetivoEliminar) return
        setEliminando(true)
        try { await seasonsApi.remove(objetivoEliminar.id); setObjetivoEliminar(null); cargar(); avisoExito('Temporada eliminada') }
        catch (e: unknown) { setError(obtenerMensajeErrorApi(e)); setObjetivoEliminar(null) }
        finally { setEliminando(false) }
    }

    async function manejarEliminarLote() {
        setEliminandoLote(true)
        try { await seasonsApi.removeBatch(Array.from(idsSeleccionados)); setIdsSeleccionados(new Set()); setEliminarLoteAbierto(false); cargar() }
        catch (e: unknown) { setError(obtenerMensajeErrorApi(e)); setEliminarLoteAbierto(false) }
        finally { setEliminandoLote(false) }
    }

    function alternarSeleccion(id: number) {
        setIdsSeleccionados((previo) => {
            const siguiente = new Set(previo)
            if (siguiente.has(id)) siguiente.delete(id); else siguiente.add(id)
            return siguiente
        })
    }

    function seleccionarTodo() {
        const idsPagina = paginados.map((temporada) => temporada.id)
        const todaPaginaSeleccionada = idsPagina.length > 0 && idsPagina.every((id) => idsSeleccionados.has(id))
        setIdsSeleccionados(todaPaginaSeleccionada ? new Set() : new Set(idsPagina))
    }

    const columnas = useMemo(() => [
        { key: 'nombre', label: 'Nombre', render: (temporada: TemporadaResponse) => <div className="flex items-center gap-2"><span className="text-sm font-bold text-rp-text">{temporada.nombre}</span>{temporada.activa && <StatusBadge tone="success">Activa</StatusBadge>}</div> },
        { key: 'inicio', label: 'Inicio', render: (temporada: TemporadaResponse) => <span className="text-sm text-rp-muted">{formatearFecha(temporada.fechaInicio)}</span> },
        { key: 'fin', label: 'Fin', render: (temporada: TemporadaResponse) => <span className="text-sm text-rp-muted">{temporada.fechaFin ? formatearFecha(temporada.fechaFin) : 'En curso'}</span> },
    ] as Column<TemporadaResponse>[], [])

    return (
        <section>
            <AdminPageHeader title="Temporadas" action={<Button size="sm" onClick={abrirCrear}><Plus size={16} />Nueva temporada</Button>} />

            <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="w-full sm:w-64">
                    <Input placeholder="Buscar por nombre..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                </div>
                <select value={filtroActiva} onChange={(e) => setFiltroActiva(e.target.value)} className="h-11 w-full rounded-md border border-rp-border bg-rp-surface px-3 text-sm text-rp-muted sm:w-40">
                    <option value="">Todas</option>
                    <option value="true">Activas</option>
                    <option value="false">Inactivas</option>
                </select>
                {idsSeleccionados.size > 0 && (
                    <Button size="sm" variant="subtle" className="w-full sm:w-auto" onClick={() => setEliminarLoteAbierto(true)}>
                        <Trash2 size={15} />Eliminar seleccionados ({idsSeleccionados.size})
                    </Button>
                )}
            </div>

            <div className="mt-4">
                <AdminTable columns={columnas} rows={paginados} getRowKey={(temporada) => temporada.id} isLoading={cargando} error={error} emptyTitle="No hay temporadas"
                    selectedIds={idsSeleccionados} onToggleSelect={alternarSeleccion} onSelectAll={seleccionarTodo}
                actions={(temporada) => (<>
                    <button onClick={() => abrirEditar(temporada)} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent"><Pencil size={15} /></button>
                    <button onClick={() => setObjetivoEliminar(temporada)} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger"><Trash2 size={15} /></button>
                </>)}
                />
                <Pagination page={pagina} pageSize={TAMANO_PAGINA} total={filtrados.length} onPageChange={setPagina} />
            </div>
            <Modal isOpen={modalAbierto} onClose={cerrarModal} onSubmit={manejarGuardar} title={objetivoEdicion ? 'Editar temporada' : 'Nueva temporada'} size="sm">
                <div className="flex flex-col gap-4">
                <Input label="Nombre" value={formulario.nombre} onChange={(e) => setFormulario((f) => ({ ...f, nombre: e.target.value }))} placeholder="Temporada 2026" />
                <Input label="Fecha de inicio" type="date" value={formulario.fechaInicio} onChange={(e) => setFormulario((f) => ({ ...f, fechaInicio: e.target.value }))} />
                <Input label="Fecha de fin (opcional)" type="date" value={formulario.fechaFin ?? ''} onChange={(e) => setFormulario((f) => ({ ...f, fechaFin: e.target.value || null }))} />
                <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-rp-muted">
                    <input type="checkbox" checked={formulario.activa ?? false} onChange={(e) => setFormulario((f) => ({ ...f, activa: e.target.checked }))} className="size-4 accent-rp-accent" />
                    Temporada activa
                </label>
                {errorFormulario && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorFormulario}</p>}
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={cerrarModal} disabled={guardando}>Cancelar</Button>
                    <Button type="submit" size="sm" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</Button>
                </div>
                </div>
            </Modal>
            <ConfirmDialog isOpen={Boolean(objetivoEliminar)} onClose={() => setObjetivoEliminar(null)} onConfirm={manejarEliminar}
                title="Eliminar temporada" description={`¿Eliminás la temporada "${objetivoEliminar?.nombre}"?`} isLoading={eliminando} />
            <ConfirmDialog isOpen={eliminarLoteAbierto} onClose={() => setEliminarLoteAbierto(false)} onConfirm={manejarEliminarLote}
                title="Eliminar seleccionadas" description={`¿Eliminás ${idsSeleccionados.size} temporada(s)?`} isLoading={eliminandoLote} />
        </section>
    )
}
