import { ChevronRight, Plus, Settings, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'

import { tournamentsApi } from '@/features/tournaments/tournamentsApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { useToast } from '@/shared/ui/Toast'
import { formatearFecha, formatearEnum } from '@/shared/lib/formatters'
import { coincidePrefijoNombre } from '@/shared/lib/tournamentView'
import type { EstadoTorneo, FormatoTorneo, TorneoResponse } from '@/shared/types/api'
import { ETIQUETA_SIGUIENTE, ESTADO_SIGUIENTE, tono } from '@/shared/lib/tournamentState'
import { AdminPageHeader } from '@/shared/ui/AdminPageHeader'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { Input } from '@/shared/ui/Input'
import { Pagination } from '@/shared/ui/Pagination'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { StatusMessage } from '@/shared/ui/StatusMessage'

const TAMANO_PAGINA = 3

const ESTADOS_TORNEO: EstadoTorneo[] = ['BORRADOR', 'INSCRIPCION', 'SORTEADO', 'EN_CURSO', 'FINALIZADO', 'CANCELADO']

const FORMATOS_TORNEO: FormatoTorneo[] = ['MINITORNEO', 'TORNEO_LARGO', 'LIGA', 'ELIMINACION_DIRECTA']

const BORDE_ESTADO: Record<string, string> = {
    live: 'border-l-rp-danger',
    success: 'border-l-rp-accent',
    warning: 'border-l-rp-amber',
    neutral: 'border-l-rp-border',
}

export default function TournamentsAdminPage() {
    const [elementos, setElementos] = useState<TorneoResponse[]>([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { success: avisoExito } = useToast()
    const [idCambiando, setIdCambiando] = useState<number | null>(null)
    const [objetivoEliminar, setObjetivoEliminar] = useState<TorneoResponse | null>(null)
    const [eliminando, setEliminando] = useState(false)
    const [busqueda, setBusqueda] = useState('')
    const [filtroEstado, setFiltroEstado] = useState<EstadoTorneo | ''>('')
    const [filtroFormato, setFiltroFormato] = useState<FormatoTorneo | ''>('')
    const [filtroCategoria, setFiltroCategoria] = useState<string>('')
    const [pagina, setPagina] = useState(1)

    const refScrollY = useRef(0)

    function cargar() {
        refScrollY.current = window.scrollY
        setCargando(true)
        tournamentsApi.getAll()
        .then((datos) => { setElementos(datos); setError(null) })
        .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
        .finally(() => {
            setCargando(false)
            requestAnimationFrame(() => window.scrollTo(0, refScrollY.current))
        })
    }
    useEffect(cargar, [])

    async function manejarCambioEstado(torneo: TorneoResponse) {
        const siguiente = ESTADO_SIGUIENTE[torneo.estado]
        if (!siguiente) return
        setIdCambiando(torneo.id)
        try { await tournamentsApi.changeStatus(torneo.id, { estado: siguiente }); setElementos((previo) => previo.map((elemento) => elemento.id === torneo.id ? { ...elemento, estado: siguiente } : elemento)); avisoExito('Estado actualizado') }
        catch (e: unknown) { setError(obtenerMensajeErrorApi(e)) }
        finally { setIdCambiando(null) }
    }

    async function manejarEliminar() {
        if (!objetivoEliminar) return
        setEliminando(true)
        try { await tournamentsApi.remove(objetivoEliminar.id); setObjetivoEliminar(null); setElementos((previo) => previo.filter((elemento) => elemento.id !== objetivoEliminar.id)); avisoExito('Torneo eliminado') }
        catch (e: unknown) { setError(obtenerMensajeErrorApi(e)); setObjetivoEliminar(null) }
        finally { setEliminando(false) }
    }

    useEffect(() => {
        setPagina(1)
    }, [busqueda, filtroEstado, filtroFormato, filtroCategoria])

    const categoriasDisponibles = Array.from(
        new Map(elementos.flatMap((elemento) => elemento.categorias ?? []).map((categoria) => [categoria.id, categoria])).values(),
    ).sort((a, b) => a.nombre.localeCompare(b.nombre))

    const torneosFiltrados = elementos
        .filter((elemento) => coincidePrefijoNombre(elemento.nombre, busqueda))
        .filter((elemento) => !filtroEstado || elemento.estado === filtroEstado)
        .filter((elemento) => !filtroFormato || elemento.formato === filtroFormato)
        .filter((elemento) => !filtroCategoria || (elemento.categorias ?? []).some((categoria) => String(categoria.id) === filtroCategoria))
        .sort((a, b) => b.id - a.id)

    const torneosPaginados = torneosFiltrados.slice((pagina - 1) * TAMANO_PAGINA, pagina * TAMANO_PAGINA)

    return (
        <section>
            <AdminPageHeader title="Torneos" action={<Button size="sm" asChild><NavLink to="/admin/torneos/nuevo"><Plus size={16} />Nuevo torneo</NavLink></Button>} />

            <div className="rp-toolbar">
                <Input placeholder="Buscar por nombre..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as EstadoTorneo | '')} className="h-11 w-full rounded-md border border-rp-border bg-rp-surface px-3 text-sm text-rp-muted sm:w-48">
                    <option value="">Todos los estados</option>
                    {ESTADOS_TORNEO.map((estado) => <option key={estado} value={estado}>{formatearEnum(estado)}</option>)}
                </select>
                <select value={filtroFormato} onChange={(e) => setFiltroFormato(e.target.value as FormatoTorneo | '')} className="h-11 w-full rounded-md border border-rp-border bg-rp-surface px-3 text-sm text-rp-muted sm:w-48">
                    <option value="">Todos los formatos</option>
                    {FORMATOS_TORNEO.map((formato) => <option key={formato} value={formato}>{formatearEnum(formato)}</option>)}
                </select>
                <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="h-11 w-full rounded-md border border-rp-border bg-rp-surface px-3 text-sm text-rp-muted sm:w-48">
                    <option value="">Todas las categorías</option>
                    {categoriasDisponibles.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}
                </select>
            </div>

            <div className="mt-8">
                {error && elementos.length > 0 ? (
                    <div className="mb-4 rounded-lg border border-rp-danger/30 bg-rp-danger/10 px-4 py-3 text-sm font-bold text-rp-danger">
                        {error}
                    </div>
                ) : null}
                {cargando ? <StatusMessage type="loading" title="Cargando torneos..." /> :
                error && elementos.length === 0 ? <StatusMessage type="error" title="Error al cargar" description={error} /> :
                torneosFiltrados.length === 0 ? <StatusMessage type="empty" title="No hay torneos" description="Creá el primero con el botón de arriba." /> : (
                <>
                <div className="grid gap-3">
                    {torneosPaginados.map((torneo) => (
                    <article key={torneo.id} className={`rounded-lg border border-l-4 border-rp-border bg-gradient-to-r from-rp-surface-2/60 to-rp-surface/82 p-5 ${BORDE_ESTADO[tono(torneo.estado)]}`}>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge tone={tono(torneo.estado)}>{formatearEnum(torneo.estado)}</StatusBadge>
                            <span className="text-xs font-bold text-rp-muted">
                                {torneo.plantillaFormatoNombre ?? formatearEnum(torneo.formato)}
                            </span>
                            {torneo.sumaPuntosRanking && <StatusBadge tone="warning">Ranking</StatusBadge>}
                            </div>
                            <h2 className="mt-2 truncate text-base font-black text-rp-text">{torneo.nombre}</h2>
                            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
                            <Dato clave="Fecha" valor={formatearFecha(torneo.fechaInicio)} />
                            <Dato clave="Lugar" valor={torneo.lugarNombre ?? 'Sin lugar'} />
                            <Dato clave="Categorías" valor={String(torneo.categorias?.length ?? 0)} />
                            </dl>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                            {ESTADO_SIGUIENTE[torneo.estado] && (
                            <Button size="sm" variant="subtle" onClick={() => manejarCambioEstado(torneo)} disabled={idCambiando === torneo.id}>
                                {idCambiando === torneo.id ? 'Actualizando...' : ETIQUETA_SIGUIENTE[torneo.estado]}
                            </Button>
                            )}
                            <Button size="sm" variant="ghost" asChild>
                            <NavLink to={`/admin/torneos/${torneo.id}/editar`} title="Configurar" aria-label="Configurar"><Settings size={16} /></NavLink>
                            </Button>
                            <Button size="sm" variant="ghost" asChild>
                            <NavLink to={`/admin/torneos/${torneo.id}`} title="Gestionar" aria-label="Gestionar"><ChevronRight size={16} /></NavLink>
                            </Button>
                            <button onClick={() => setObjetivoEliminar(torneo)} className="flex size-9 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger">
                                <Trash2 size={15} />
                            </button>
                        </div>
                        </div>
                    </article>
                    ))}
                </div>
                <Pagination page={pagina} pageSize={TAMANO_PAGINA} total={torneosFiltrados.length} onPageChange={setPagina} />
                </>
                )}
            </div>

            <ConfirmDialog isOpen={Boolean(objetivoEliminar)} onClose={() => setObjetivoEliminar(null)} onConfirm={manejarEliminar}
                title="Eliminar torneo" description={`¿Eliminás "${objetivoEliminar?.nombre}"? Esta acción no se puede deshacer.`} isLoading={eliminando} />
        </section>
    )
}

function Dato({ clave, valor }: { clave: string; valor: string }) {
    return (
        <div className="min-w-0">
            <dt className="text-[10px] font-black uppercase tracking-[0.1em] text-rp-muted">{clave}</dt>
            <dd className="truncate text-sm font-bold text-rp-text">{valor}</dd>
        </div>
    )
}
