import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { placesApi } from '@/features/catalog/catalogApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { useToast } from '@/shared/ui/Toast'
import { coincidePrefijoNombre } from '@/shared/lib/tournamentView'
import type { LugarRequest, LugarResponse } from '@/shared/types/api'
import { AdminTable, type Column } from '@/shared/ui/AdminTable'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Pagination } from '@/shared/ui/Pagination'

const TAMANO_PAGINA = 8
const VACIO: LugarRequest = { nombre: '', direccion: '' }

export default function PlacesPage() {
    const [elementos, setElementos] = useState<LugarResponse[]>([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { success: avisoExito } = useToast()
    const [modalAbierto, setModalAbierto] = useState(false)
    const [objetivoEdicion, setObjetivoEdicion] = useState<LugarResponse | null>(null)
    const [formulario, setFormulario] = useState<LugarRequest>(VACIO)
    const [errorFormulario, setErrorFormulario] = useState<string | null>(null)
    const [guardando, setGuardando] = useState(false)
    const [objetivoEliminar, setObjetivoEliminar] = useState<LugarResponse | null>(null)
    const [eliminando, setEliminando] = useState(false)

    const [idsSeleccionados, setIdsSeleccionados] = useState<Set<number>>(new Set())
    const [eliminarLoteAbierto, setEliminarLoteAbierto] = useState(false)
    const [eliminandoLote, setEliminandoLote] = useState(false)

    const [busqueda, setBusqueda] = useState('')
    const [pagina, setPagina] = useState(1)

    const refScrollY = useRef(0)

    function cargar() {
        refScrollY.current = window.scrollY
        setCargando(true)
        placesApi.getAll()
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
    }, [busqueda])

    const filtrados = useMemo(() => elementos.filter((lugar) => {
        return coincidePrefijoNombre(lugar.nombre, busqueda)
    }).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })), [elementos, busqueda])

    const paginados = filtrados.slice((pagina - 1) * TAMANO_PAGINA, pagina * TAMANO_PAGINA)

    function abrirCrear() { setObjetivoEdicion(null); setFormulario(VACIO); setErrorFormulario(null); setModalAbierto(true) }
    function abrirEditar(lugar: LugarResponse) { setObjetivoEdicion(lugar); setFormulario({ nombre: lugar.nombre, direccion: lugar.direccion }); setErrorFormulario(null); setModalAbierto(true) }
    function cerrarModal() { setModalAbierto(false); setErrorFormulario(null) }

    async function manejarGuardar() {
        if (!formulario.nombre.trim() || !formulario.direccion.trim()) { setErrorFormulario('Nombre y dirección son obligatorios.'); return }
        setGuardando(true); setErrorFormulario(null)
        try {
        if (objetivoEdicion) await placesApi.update(objetivoEdicion.id, formulario)
        else await placesApi.create(formulario)
        avisoExito(objetivoEdicion ? 'Lugar actualizado' : 'Lugar creado')
        cerrarModal(); cargar()
        } catch (e: unknown) { setErrorFormulario(obtenerMensajeErrorApi(e)) }
        finally { setGuardando(false) }
    }

    async function manejarEliminar() {
        if (!objetivoEliminar) return
        setEliminando(true)
        try { await placesApi.remove(objetivoEliminar.id); setObjetivoEliminar(null); cargar(); avisoExito('Lugar eliminado') }
        catch (e: unknown) { setError(obtenerMensajeErrorApi(e)); setObjetivoEliminar(null) }
        finally { setEliminando(false) }
    }

    async function manejarEliminarLote() {
        setEliminandoLote(true)
        try { await placesApi.removeBatch(Array.from(idsSeleccionados)); setIdsSeleccionados(new Set()); setEliminarLoteAbierto(false); cargar() }
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
        const idsPagina = paginados.map((lugar) => lugar.id)
        const todaPaginaSeleccionada = idsPagina.length > 0 && idsPagina.every((id) => idsSeleccionados.has(id))
        setIdsSeleccionados(todaPaginaSeleccionada ? new Set() : new Set(idsPagina))
    }

    const columnas = useMemo(() => [
        { key: 'nombre', label: 'Nombre', render: (lugar: LugarResponse) => <div className="flex items-center gap-2"><MapPin size={14} className="shrink-0 text-rp-accent" /><span className="text-sm font-bold text-rp-text">{lugar.nombre}</span></div> },
        { key: 'dir', label: 'Dirección', render: (lugar: LugarResponse) => <span className="text-sm text-rp-muted">{lugar.direccion}</span> },
    ] as Column<LugarResponse>[], [])

    return (
        <section>
            <div className="flex items-end justify-between gap-4">
                <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-rp-accent">Admin</p>
                <h1 className="mt-2 text-3xl font-black text-rp-text">Lugares</h1>
                </div>
                <Button size="sm" onClick={abrirCrear}><Plus size={16} />Nuevo lugar</Button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="w-64">
                    <Input placeholder="Buscar por nombre..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                </div>
                {idsSeleccionados.size > 0 && (
                    <Button size="sm" variant="subtle" onClick={() => setEliminarLoteAbierto(true)}>
                        <Trash2 size={15} />Eliminar seleccionados ({idsSeleccionados.size})
                    </Button>
                )}
            </div>

            <div className="mt-4">
                <AdminTable columns={columnas} rows={paginados} getRowKey={(lugar) => lugar.id} isLoading={cargando} error={error} emptyTitle="No hay lugares"
                    selectedIds={idsSeleccionados} onToggleSelect={alternarSeleccion} onSelectAll={seleccionarTodo}
                actions={(lugar) => (<>
                    <button onClick={() => abrirEditar(lugar)} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent"><Pencil size={15} /></button>
                    <button onClick={() => setObjetivoEliminar(lugar)} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger"><Trash2 size={15} /></button>
                </>)}
                />
                <Pagination page={pagina} pageSize={TAMANO_PAGINA} total={filtrados.length} onPageChange={setPagina} />
            </div>
            <Modal isOpen={modalAbierto} onClose={cerrarModal} title={objetivoEdicion ? 'Editar lugar' : 'Nuevo lugar'} size="sm">
                <div className="flex flex-col gap-4">
                <Input label="Nombre" value={formulario.nombre} onChange={(e) => setFormulario((f) => ({ ...f, nombre: e.target.value }))} placeholder="Top Padel" />
                <Input label="Dirección" value={formulario.direccion} onChange={(e) => setFormulario((f) => ({ ...f, direccion: e.target.value }))} placeholder="Av. Libertad 1234" />
                {errorFormulario && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorFormulario}</p>}
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={cerrarModal} disabled={guardando}>Cancelar</Button>
                    <Button size="sm" onClick={manejarGuardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</Button>
                </div>
                </div>
            </Modal>
            <ConfirmDialog isOpen={Boolean(objetivoEliminar)} onClose={() => setObjetivoEliminar(null)} onConfirm={manejarEliminar}
                title="Eliminar lugar" description={`¿Eliminás el lugar "${objetivoEliminar?.nombre}"?`} isLoading={eliminando} />
            <ConfirmDialog isOpen={eliminarLoteAbierto} onClose={() => setEliminarLoteAbierto(false)} onConfirm={manejarEliminarLote}
                title="Eliminar seleccionados" description={`¿Eliminás ${idsSeleccionados.size} lugar(es)?`} isLoading={eliminandoLote} />
        </section>
    )
}
