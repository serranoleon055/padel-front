import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { categoriesApi } from '@/features/catalog/catalogApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { useToast } from '@/shared/ui/Toast'
import { formatearEnum } from '@/shared/lib/formatters'
import { coincidePrefijoNombre } from '@/shared/lib/tournamentView'
import type { CategoriaRequest, CategoriaResponse, Genero } from '@/shared/types/api'
import { AdminTable, type Column } from '@/shared/ui/AdminTable'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Pagination } from '@/shared/ui/Pagination'
import { Select } from '@/shared/ui/Select'

const TAMANO_PAGINA = 8
const VACIO: CategoriaRequest = { nombre: '', nivel: 0, genero: 'MASCULINO' }

export default function CategoriesPage() {
    const [elementos, setElementos] = useState<CategoriaResponse[]>([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { success: avisoExito } = useToast()
    const [modalAbierto, setModalAbierto] = useState(false)
    const [objetivoEdicion, setObjetivoEdicion] = useState<CategoriaResponse | null>(null)
    const [formulario, setFormulario] = useState<CategoriaRequest>(VACIO)
    const [errorFormulario, setErrorFormulario] = useState<string | null>(null)
    const [guardando, setGuardando] = useState(false)
    const [objetivoEliminar, setObjetivoEliminar] = useState<CategoriaResponse | null>(null)
    const [eliminando, setEliminando] = useState(false)

    const [idsSeleccionados, setIdsSeleccionados] = useState<Set<number>>(new Set())
    const [eliminarLoteAbierto, setEliminarLoteAbierto] = useState(false)
    const [eliminandoLote, setEliminandoLote] = useState(false)

    const [busqueda, setBusqueda] = useState('')
    const [filtroGenero, setFiltroGenero] = useState<Genero>('MASCULINO')
    const [pagina, setPagina] = useState(1)

    const refTabla = useRef<HTMLDivElement>(null)
    const refScrollY = useRef(0)

    function cargar() {
        refScrollY.current = window.scrollY
        setCargando(true)
        categoriesApi.getAll()
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
    }, [busqueda, filtroGenero])

    const filtrados = useMemo(() => elementos.filter((categoria) => {
        const coincideNombre = coincidePrefijoNombre(categoria.nombre, busqueda)
        const coincideGenero = categoria.genero === filtroGenero
        return coincideNombre && coincideGenero
    }).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })), [filtroGenero, elementos, busqueda])

    const paginados = filtrados.slice((pagina - 1) * TAMANO_PAGINA, pagina * TAMANO_PAGINA)

    function abrirCrear() { setObjetivoEdicion(null); setFormulario(VACIO); setErrorFormulario(null); setModalAbierto(true) }
    function abrirEditar(categoria: CategoriaResponse) { setObjetivoEdicion(categoria); setFormulario({ nombre: categoria.nombre, nivel: categoria.nivel, genero: categoria.genero }); setErrorFormulario(null); setModalAbierto(true) }
    function cerrarModal() { setModalAbierto(false); setErrorFormulario(null) }

    async function manejarGuardar() {
        if (!formulario.nombre.trim()) { setErrorFormulario('El nombre es obligatorio.'); return }
        const nivel = Number(formulario.nivel)
        if (nivel < 1 || nivel > 8) { setErrorFormulario('El nivel debe estar entre 1 y 8.'); return }
        setGuardando(true); setErrorFormulario(null)
        try {
        objetivoEdicion ? await categoriesApi.update(objetivoEdicion.id, { ...formulario, nivel }) : await categoriesApi.create({ ...formulario, nivel })
        cerrarModal(); cargar(); avisoExito(objetivoEdicion ? 'Categoría actualizada' : 'Categoría creada')
        } catch (e: unknown) { setErrorFormulario(obtenerMensajeErrorApi(e)) }
        finally { setGuardando(false) }
    }

    async function manejarEliminar() {
        if (!objetivoEliminar) return
        setEliminando(true)
        try { await categoriesApi.remove(objetivoEliminar.id); setObjetivoEliminar(null); cargar(); avisoExito('Categoría eliminada') }
        catch (e: unknown) { setError(obtenerMensajeErrorApi(e)); setObjetivoEliminar(null) }
        finally { setEliminando(false) }
    }

    async function manejarEliminarLote() {
        setEliminandoLote(true)
        try { await categoriesApi.removeBatch(Array.from(idsSeleccionados)); setIdsSeleccionados(new Set()); setEliminarLoteAbierto(false); cargar() }
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
        const idsPagina = paginados.map((categoria) => categoria.id)
        const todaPaginaSeleccionada = idsPagina.length > 0 && idsPagina.every((id) => idsSeleccionados.has(id))
        setIdsSeleccionados(todaPaginaSeleccionada ? new Set() : new Set(idsPagina))
    }

    const columnas = useMemo(() => [
        { key: 'nombre', label: 'Nombre', render: (categoria: CategoriaResponse) => <span className="text-sm font-bold text-rp-text">{categoria.nombre}</span> },
        { key: 'nivel', label: 'Nivel', render: (categoria: CategoriaResponse) => <span className="text-sm text-rp-muted">Nivel {categoria.nivel}</span> },
        { key: 'genero', label: 'Género', render: (categoria: CategoriaResponse) => <span className="text-sm text-rp-muted">{formatearEnum(categoria.genero)}</span> },
    ] as Column<CategoriaResponse>[], [])

    return (
        <section>
            <div className="flex items-end justify-between gap-4">
                <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-rp-accent">Admin</p>
                <h1 className="mt-2 text-3xl font-black text-rp-text">Categorías</h1>
                </div>
                <Button size="sm" onClick={abrirCrear}><Plus size={16} />Nueva categoría</Button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="w-64">
                    <Input placeholder="Buscar por nombre..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                </div>
                <Select value={filtroGenero} onChange={(e) => setFiltroGenero(e.target.value as Genero)} className="min-w-56">
                    <option value="MASCULINO">Masculino</option>
                    <option value="FEMENINO">Femenino</option>
                </Select>
                {idsSeleccionados.size > 0 && (
                    <Button size="sm" variant="subtle" onClick={() => setEliminarLoteAbierto(true)}>
                        <Trash2 size={15} />Eliminar seleccionados ({idsSeleccionados.size})
                    </Button>
                )}
            </div>

            <div className="mt-4" ref={refTabla}>
                <AdminTable columns={columnas} rows={paginados} getRowKey={(categoria) => categoria.id} isLoading={cargando} error={error} emptyTitle="No hay categorías"
                    selectedIds={idsSeleccionados} onToggleSelect={alternarSeleccion} onSelectAll={seleccionarTodo}
                actions={(categoria) => (<>
                    <button onClick={() => abrirEditar(categoria)} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent"><Pencil size={15} /></button>
                    <button onClick={() => setObjetivoEliminar(categoria)} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger"><Trash2 size={15} /></button>
                </>)}
                />
                <Pagination page={pagina} pageSize={TAMANO_PAGINA} total={filtrados.length} onPageChange={setPagina} />
            </div>
            <Modal isOpen={modalAbierto} onClose={cerrarModal} title={objetivoEdicion ? 'Editar categoría' : 'Nueva categoría'} size="sm">
                <div className="flex flex-col gap-4">
                <Input label="Nombre" value={formulario.nombre} onChange={(e) => setFormulario((f) => ({ ...f, nombre: e.target.value }))} placeholder="Primera" />
                <Input label="Nivel (1-8)" type="text" inputMode="numeric" pattern="[1-8]" maxLength={1} placeholder="1-8" value={formulario.nivel ? String(formulario.nivel) : ''} onChange={(e) => {
                    const normalizado = e.target.value.replace(/\D/g, '').slice(0, 1)
                    const nivel = normalizado ? Math.min(8, Number(normalizado)) : 0
                    setFormulario((f) => ({ ...f, nivel }))
                }} />
                <Select label="Género" value={formulario.genero} onChange={(e) => setFormulario((f) => ({ ...f, genero: e.target.value as Genero }))}>
                    <option value="MASCULINO">Masculino</option>
                    <option value="FEMENINO">Femenino</option>
                </Select>
                {errorFormulario && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorFormulario}</p>}
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={cerrarModal} disabled={guardando}>Cancelar</Button>
                    <Button size="sm" onClick={manejarGuardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</Button>
                </div>
                </div>
            </Modal>
            <ConfirmDialog isOpen={Boolean(objetivoEliminar)} onClose={() => setObjetivoEliminar(null)} onConfirm={manejarEliminar}
                title="Eliminar categoría" description={`¿Eliminás la categoría "${objetivoEliminar?.nombre}"?`} isLoading={eliminando} />
            <ConfirmDialog isOpen={eliminarLoteAbierto} onClose={() => setEliminarLoteAbierto(false)} onConfirm={manejarEliminarLote}
                title="Eliminar seleccionadas" description={`¿Eliminás ${idsSeleccionados.size} categoría(s)?`} isLoading={eliminandoLote} />
        </section>
    )
}
