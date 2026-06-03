import { ArrowLeft, CalendarDays, ChevronDown, Clock, MapPin, Play, Plus, Shuffle, Trash2, Trophy, Users } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, useParams } from 'react-router-dom'

import { categoriesApi } from '@/features/catalog/catalogApi'
import { playersApi } from '@/features/players/playersApi'
import { tournamentsApi } from '@/features/tournaments/tournamentsApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { useToast } from '@/shared/ui/Toast'
import { formatearFecha, formatearFechaHora, formatearEnum, formatearEstadoPartido, formatearFechaPartido, formatearEtapaPartido, formatearPareja } from '@/shared/lib/formatters'
import { obtenerPartidoCampeon, obtenerNombreSubcampeon } from '@/shared/lib/tournamentView'
import type {
    CategoriaResponse,
    Genero,
    GrupoResponse,
    JugadorResponse,
    ParejaRequest,
    PartidoResponse,
    TorneoDetalleResponse,
} from '@/shared/types/api'
import { ETIQUETA_RETROCESO, PUEDE_RETROCEDER, puedeSortear, puedeCargarResultados, ETIQUETA_SIGUIENTE, ESTADO_SIGUIENTE, tono } from '@/shared/lib/tournamentState'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Select } from '@/shared/ui/Select'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { StatusMessage } from '@/shared/ui/StatusMessage'

const PAREJA_VACIA: ParejaRequest = { jugador1Id: 0, jugador2Id: 0, categoriaId: 0, esCabezaDeSerie: false }

export default function TournamentAdminDetailPage() {
    const { torneoId } = useParams()
    const id = Number(torneoId)

    const [detalle, setDetalle] = useState<TorneoDetalleResponse | null>(null)
    const [jugadores, setJugadores] = useState<JugadorResponse[]>([])
    const [todasCategorias, setTodasCategorias] = useState<CategoriaResponse[]>([])
    const [grupos, setGrupos] = useState<GrupoResponse[]>([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [errorAccion, setErrorAccion] = useState<string | null>(null)

    const [pestana, setPestana] = useState<'parejas' | 'partidos' | 'grupos'>('parejas')
    const [nombreCategoriaSeleccionada, setNombreCategoriaSeleccionada] = useState('')
    const [cambiandoEstado, setCambiandoEstado] = useState(false)
    const [retrocediendo, setRetrocediendo] = useState(false)
    const [confirmarSorteo, setConfirmarSorteo] = useState(false)
    const [sorteando, setSorteando] = useState(false)

    const [parejaAbierta, setParejaAbierta] = useState(false)
    const [formularioPareja, setFormularioPareja] = useState<ParejaRequest>(PAREJA_VACIA)
    const [errorPareja, setErrorPareja] = useState<string | null>(null)
    const [guardandoPareja, setGuardandoPareja] = useState(false)
    const [parejaAEliminar, setParejaAEliminar] = useState<{ id: number; name: string } | null>(null)
    const [eliminandoPareja, setEliminandoPareja] = useState(false)
    const [parejaARetirar, setParejaARetirar] = useState<{ id: number; name: string } | null>(null)
    const [retirandoPareja, setRetirandoPareja] = useState(false)

    const [resultadoAbierto, setResultadoAbierto] = useState(false)
    const [partidoResultado, setPartidoResultado] = useState<PartidoResponse | null>(null)
    const [marcador, setMarcador] = useState('')
    const [errorResultado, setErrorResultado] = useState<string | null>(null)
    const [guardandoResultado, setGuardandoResultado] = useState(false)

    const [programacionAbierta, setProgramacionAbierta] = useState(false)
    const [partidoProgramacion, setPartidoProgramacion] = useState<PartidoResponse | null>(null)
    const [fechaProgramacion, setFechaProgramacion] = useState('')
    const [errorProgramacion, setErrorProgramacion] = useState<string | null>(null)
    const [guardandoProgramacion, setGuardandoProgramacion] = useState(false)

    const [woAbierto, setWoAbierto] = useState(false)
    const [partidoWo, setPartidoWo] = useState<PartidoResponse | null>(null)
    const [woGanadorId, setWoGanadorId] = useState<number>(0)
    const [woTipo, setWoTipo] = useState<'WALKOVER' | 'RETIRO'>('WALKOVER')
    const [woMotivo, setWoMotivo] = useState('')
    const [errorWo, setErrorWo] = useState<string | null>(null)
    const [guardandoWo, setGuardandoWo] = useState(false)

    const [gruposExpandidos, setGruposExpandidos] = useState<Set<number>>(new Set())
    const { success: avisoExito } = useToast()

    function recargarDetalle() {
        tournamentsApi.getDetail(id)
        .then((datos) => { setDetalle(datos); setError(null) })
        .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
    }

    function recargarDetalleYGrupos() {
        Promise.all([tournamentsApi.getDetail(id), tournamentsApi.getGroups(id)])
        .then(([datos, gruposDatos]) => { setDetalle(datos); setGrupos(gruposDatos); setError(null) })
        .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
    }

    useEffect(() => {
        if (!Number.isFinite(id)) return
        setCargando(true)
        Promise.all([tournamentsApi.getDetail(id), categoriesApi.getAll(), tournamentsApi.getGroups(id)])
        .then(([datos, categoriasDatos, gruposDatos]) => { setDetalle(datos); setTodasCategorias(categoriasDatos); setGrupos(gruposDatos); setError(null) })
        .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
        .finally(() => setCargando(false))
    }, [id])

    useEffect(() => {
        if (parejaAbierta && jugadores.length === 0) {
            playersApi.getAll().then(setJugadores).catch(() => {})
        }
    }, [parejaAbierta, jugadores.length])

    async function manejarCambioEstado() {
        if (!detalle) return
        const siguiente = ESTADO_SIGUIENTE[detalle.torneo.estado]
        if (!siguiente) return
        setCambiandoEstado(true); setErrorAccion(null)
        try { await tournamentsApi.changeStatus(id, { estado: siguiente }); recargarDetalle(); avisoExito('Estado del torneo actualizado') }
        catch (e: unknown) { setErrorAccion(obtenerMensajeErrorApi(e)) }
        finally { setCambiandoEstado(false) }
    }

    async function manejarRetroceso() {
        if (!detalle) return
        const previo = PUEDE_RETROCEDER[detalle.torneo.estado]
        if (!previo) return
        setRetrocediendo(true); setErrorAccion(null)
        try { await tournamentsApi.changeStatus(id, { estado: previo }); recargarDetalle() }
        catch (e: unknown) { setErrorAccion(obtenerMensajeErrorApi(e)) }
        finally { setRetrocediendo(false) }
    }

    async function manejarSorteo() {
        setSorteando(true); setErrorAccion(null)
        try { await tournamentsApi.generateDraw(id); setConfirmarSorteo(false); recargarDetalleYGrupos(); avisoExito('Sorteo generado exitosamente') }
        catch (e: unknown) { setErrorAccion(obtenerMensajeErrorApi(e)); setConfirmarSorteo(false) }
        finally { setSorteando(false) }
    }

    async function manejarGuardarPareja() {
        if (!formularioPareja.jugador1Id || !formularioPareja.jugador2Id || !formularioPareja.categoriaId) { setErrorPareja('Seleccioná ambos jugadores y la categoría.'); return }
        if (formularioPareja.jugador1Id === formularioPareja.jugador2Id) { setErrorPareja('Los jugadores deben ser distintos.'); return }
        setGuardandoPareja(true); setErrorPareja(null)
        try { await tournamentsApi.addPair(id, formularioPareja); setParejaAbierta(false); setFormularioPareja(PAREJA_VACIA); recargarDetalle(); avisoExito('Pareja inscripta') }
        catch (e: unknown) { setErrorPareja(obtenerMensajeErrorApi(e)) }
        finally { setGuardandoPareja(false) }
    }

    async function manejarEliminarPareja() {
        if (!parejaAEliminar) return
        setEliminandoPareja(true)
        try { await tournamentsApi.removePair(id, parejaAEliminar.id); setParejaAEliminar(null); recargarDetalle(); avisoExito('Pareja eliminada') }
        catch (e: unknown) { setErrorAccion(obtenerMensajeErrorApi(e)); setParejaAEliminar(null) }
        finally { setEliminandoPareja(false) }
    }

    const manejarIniciarPartido = useCallback(async (partidoId: number) => {
        setErrorAccion(null)
        try { await tournamentsApi.startMatch(id, partidoId); recargarDetalle() }
        catch (e: unknown) { setErrorAccion(obtenerMensajeErrorApi(e)) }
    }, [id])

    async function manejarGuardarResultado() {
        if (!partidoResultado || !marcador.trim()) { setErrorResultado('El marcador es obligatorio.'); return }
        setGuardandoResultado(true); setErrorResultado(null)
        try { await tournamentsApi.loadResult(id, partidoResultado.id, { marcador: marcador.trim() }); setResultadoAbierto(false); recargarDetalleYGrupos(); avisoExito('Resultado cargado') }
        catch (e: unknown) { setErrorResultado(obtenerMensajeErrorApi(e)) }
        finally { setGuardandoResultado(false) }
    }

    const manejarCargarResultado = useCallback((partido: PartidoResponse) => {
        setPartidoResultado(partido); setMarcador(''); setErrorResultado(null); setResultadoAbierto(true)
    }, [])

    async function manejarGuardarProgramacion() {
        if (!partidoProgramacion || !fechaProgramacion) { setErrorProgramacion('La fecha y hora son obligatorias.'); return }
        setGuardandoProgramacion(true); setErrorProgramacion(null)
        try {
            await tournamentsApi.scheduleMatch(id, partidoProgramacion.id, { fechaHora: fechaProgramacion })
            setProgramacionAbierta(false); recargarDetalle(); avisoExito('Partido programado')
        } catch (e: unknown) { setErrorProgramacion(obtenerMensajeErrorApi(e)) }
        finally { setGuardandoProgramacion(false) }
    }

    const manejarProgramarPartido = useCallback((partido: PartidoResponse) => {
        setPartidoProgramacion(partido)
        setFechaProgramacion(partido.fechaHoraProgramada ? partido.fechaHoraProgramada.slice(0, 16) : '')
        setErrorProgramacion(null)
        setProgramacionAbierta(true)
    }, [])

    async function manejarGuardarWo() {
        if (!partidoWo || !woGanadorId) { setErrorWo('Seleccioná la pareja ganadora.'); return }
        setGuardandoWo(true); setErrorWo(null)
        try {
            await tournamentsApi.declareWalkover(id, partidoWo.id, { ganadorParejaId: woGanadorId, tipo: woTipo, motivo: woMotivo || undefined })
            setWoAbierto(false); recargarDetalleYGrupos(); avisoExito(`${woTipo === 'WALKOVER' ? 'W.O.' : 'Retiro'} declarado`)
        } catch (e: unknown) { setErrorWo(obtenerMensajeErrorApi(e)) }
        finally { setGuardandoWo(false) }
    }

    const manejarDeclararWo = useCallback((partido: PartidoResponse) => {
        setPartidoWo(partido); setWoGanadorId(0); setWoTipo('WALKOVER'); setWoMotivo(''); setErrorWo(null); setWoAbierto(true)
    }, [])

    function obtenerJugadoresPorGenero(genero: Genero | null): JugadorResponse[] {
        if (!genero) return jugadores
        return jugadores.filter((jugador) => jugador.genero === genero)
    }

    const categoriaSeleccionada = todasCategorias.find((categoria) => categoria.id === formularioPareja.categoriaId)

    function alternarGrupoExpandido(grupoId: number) {
        setGruposExpandidos((previo) => {
            const siguiente = new Set(previo)
            if (siguiente.has(grupoId)) siguiente.delete(grupoId); else siguiente.add(grupoId)
            return siguiente
        })
    }

    const datosDetalle = detalle
    const torneo = datosDetalle?.torneo ?? null
    const parejas = datosDetalle?.parejas ?? []
    const partidos = datosDetalle?.partidos ?? []
    const nombresCategorias = torneo?.categorias.map((categoria) => categoria.nombre) ?? []
    const categoriaActiva = nombreCategoriaSeleccionada || nombresCategorias[0] || ''
    const parejasSeleccionadas = categoriaActiva ? parejas.filter((pareja) => pareja.categoriaNombre === categoriaActiva) : parejas
    const partidosSeleccionados = categoriaActiva ? partidos.filter((partido) => partido.categoriaNombre === categoriaActiva) : partidos
    const gruposSeleccionados = categoriaActiva ? grupos.filter((grupo) => grupo.categoriaNombre === categoriaActiva) : grupos
    const partidoCampeon = obtenerPartidoCampeon(partidosSeleccionados)
    const nombreSubcampeon = obtenerNombreSubcampeon(partidoCampeon)
    const pendientes = partidosSeleccionados.filter((partido) => partido.estado === 'PENDIENTE')
    const finalizados = partidosSeleccionados.filter((partido) => partido.estado === 'FINALIZADO')

    const puedeInscribir = torneo?.estado === 'INSCRIPCION'
    const mostrarSorteo = torneo ? puedeSortear(torneo.estado, parejas.length, partidos.length) : false
    const mostrarResultados = torneo ? puedeCargarResultados(torneo.estado, pendientes.length) : false
    const puedeProgramar = torneo ? (torneo.estado === 'SORTEADO' || torneo.estado === 'EN_CURSO') : false
    const categoriasTorneo = torneo ? todasCategorias.filter((categoria) => torneo.categorias.some((tc) => tc.id === categoria.id)) : []

    const infoSorteo = useMemo(() => {
        if (!mostrarSorteo || !torneo) return null
        const info = categoriasTorneo.map((categoria) => {
            const cantidad = parejas.filter((pareja) => pareja.categoriaNombre === categoria.nombre).length
            return `${categoria.nombre}: ${cantidad} parejas`
        })
        return info
    }, [mostrarSorteo, categoriasTorneo, parejas, torneo])

    const partidosPorCategoria = useMemo(() => {
        const mapa = new Map<string, PartidoResponse[]>()
        for (const partido of partidosSeleccionados) {
            const clave = partido.categoriaNombre ?? 'Sin categoría'
            if (!mapa.has(clave)) mapa.set(clave, [])
            mapa.get(clave)!.push(partido)
        }
        return mapa
    }, [partidosSeleccionados])

    const jugadoresPorGenero = useMemo(
        () => obtenerJugadoresPorGenero(categoriaSeleccionada?.genero ?? null),
        [jugadores, categoriaSeleccionada]
    )

    if (cargando) return <section className="py-8"><StatusMessage type="loading" title="Cargando torneo..." /></section>
    if (error || !detalle) return <section className="py-8"><StatusMessage type="error" title="No se pudo cargar el torneo" description={error ?? undefined} /></section>
    if (!torneo) return <section className="py-8"><StatusMessage type="error" title="No se pudo cargar el torneo" description="La API no devolvió los datos principales." /></section>

    return (
        <section>
            <Button variant="ghost" size="sm" asChild>
                <NavLink to="/admin/torneos"><ArrowLeft size={16} />Volver a torneos</NavLink>
            </Button>

            <div className="mt-5 rounded-lg border border-rp-border bg-rp-surface/82 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={tono(torneo.estado)}>{formatearEnum(torneo.estado)}</StatusBadge>
                    <span className="text-xs font-bold text-rp-muted">{formatearEnum(torneo.formato)}</span>
                    </div>
                    <h1 className="mt-2 text-2xl font-black text-rp-text sm:text-3xl">{torneo.nombre}</h1>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-rp-muted">
                    <span className="flex items-center gap-1"><MapPin size={13} />{torneo.lugarNombre ?? 'Sin lugar'}</span>
                    <span className="flex items-center gap-1"><CalendarDays size={13} />{formatearFecha(torneo.fechaInicio)}</span>
                    {torneo.fechaFin && <span className="flex items-center gap-1"><CalendarDays size={13} />→ {formatearFecha(torneo.fechaFin)}</span>}
                    <span className="flex items-center gap-1"><Users size={13} />{parejas.length} parejas</span>
                    <span className="flex items-center gap-1"><Trophy size={13} />{partidos.length} partidos</span>
                    </div>
                    {torneo.temporadaNombre && (
                    <p className="mt-1 text-xs text-rp-muted">Temporada: <strong className="text-rp-text">{torneo.temporadaNombre}</strong></p>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    {ESTADO_SIGUIENTE[torneo.estado] && (
                    <Button size="sm" onClick={manejarCambioEstado} disabled={cambiandoEstado}>
                        {cambiandoEstado ? 'Actualizando...' : ETIQUETA_SIGUIENTE[torneo.estado]}
                    </Button>
                    )}
                    {PUEDE_RETROCEDER[torneo.estado] && (
                    <Button size="sm" variant="ghost" onClick={manejarRetroceso} disabled={retrocediendo}>
                        {retrocediendo ? 'Actualizando...' : ETIQUETA_RETROCESO[torneo.estado]}
                    </Button>
                    )}
                    {mostrarSorteo && (
                    <Button size="sm" variant="subtle" onClick={() => setConfirmarSorteo(true)}>
                        <Shuffle size={15} />Generar sorteo
                    </Button>
                    )}
                </div>
                </div>
                {errorAccion && <p className="mt-4 rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorAccion}</p>}

                <div className="mt-4 flex flex-wrap gap-2">
                {torneo.categorias.map((categoria) => (
                    <StatusBadge key={categoria.id} tone="neutral">{categoria.nombre}</StatusBadge>
                ))}
                {torneo.sumaPuntosRanking && <StatusBadge tone="warning">Suma ranking</StatusBadge>}
                {torneo.esMixto && <StatusBadge tone="neutral">Mixto</StatusBadge>}
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <TarjetaDato label={`Parejas ${categoriaActiva ? `(${categoriaActiva})` : ''}`} value={parejasSeleccionadas.length} />
                <TarjetaDato label={`Partidos ${categoriaActiva ? `(${categoriaActiva})` : ''}`} value={partidosSeleccionados.length} />
                <TarjetaDato label="Pendientes" value={pendientes.length} />
                <TarjetaDato label="Finalizados" value={finalizados.length} />
            </div>

            {nombresCategorias.length > 0 && (
                <div className="mt-4 max-w-xs">
                    <Select label="Categoría gestionada" value={categoriaActiva} onChange={(e) => setNombreCategoriaSeleccionada(e.target.value)}>
                        {nombresCategorias.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
                    </Select>
                </div>
            )}

            {torneo.estado === 'FINALIZADO' && (
                <div className="mt-4 rounded-lg border border-rp-border bg-rp-surface/82 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-rp-accent">Resultado final de {categoriaActiva}</p>
                    <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                        <span className="font-bold text-rp-text">Campeón: {partidoCampeon?.ganadorNombre ?? 'Sin dato'}</span>
                        <span className="font-bold text-rp-muted">Subcampeón: {nombreSubcampeon ?? 'Sin dato'}</span>
                    </div>
                </div>
            )}

            <div className="mt-6 flex gap-1 rounded-lg border border-rp-border bg-rp-surface/82 p-1">
                {(['parejas', 'partidos', 'grupos'] as const).map((p) => (
                <button key={p} onClick={() => setPestana(p)} className={`flex-1 rounded-md py-2 text-sm font-bold transition ${pestana === p ? 'bg-rp-surface-2 text-rp-accent' : 'text-rp-muted hover:text-rp-text'}`}>
                    {p === 'parejas' ? `Parejas (${parejasSeleccionadas.length})` : p === 'partidos' ? `Partidos (${partidosSeleccionados.length})` : `Grupos (${gruposSeleccionados.length})`}
                </button>
                ))}
            </div>

            {pestana === 'parejas' && (
                <div className="mt-4">
                {puedeInscribir && (
                    <div className="mb-4 flex justify-end">
                    <Button size="sm" onClick={() => { setFormularioPareja(PAREJA_VACIA); setErrorPareja(null); setParejaAbierta(true) }}>
                        <Plus size={16} />Inscribir pareja
                    </Button>
                    </div>
                )}
                {parejasSeleccionadas.length === 0 ? (
                    <StatusMessage type="empty" title="No hay parejas" description={puedeInscribir ? 'Inscribí parejas con el botón.' : 'Requiere estado INSCRIPCION.'} />
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                    {parejasSeleccionadas.map((pareja) => (
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
                                <button onClick={() => setParejaAEliminar({ id: pareja.id, name: `${pareja.jugador1Nombre} / ${pareja.jugador2Nombre}` })} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger" title="Eliminar pareja">
                                <Trash2 size={14} />
                                </button>
                            )}
                            {(torneo?.estado === 'EN_CURSO' || torneo?.estado === 'SORTEADO') && (
                                <button onClick={() => setParejaARetirar({ id: pareja.id, name: `${pareja.jugador1Nombre} / ${pareja.jugador2Nombre}` })} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger" title="Retirar pareja del torneo (genera W.O.)">
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
            )}

            {pestana === 'partidos' && (
                <div className="mt-4">
                {partidosSeleccionados.length === 0 ? (
                    <StatusMessage type="empty" title="No hay partidos" description={mostrarSorteo ? 'Generá el sorteo desde el encabezado.' : 'Los partidos se generan al sortear (estado INSCRIPCION).'} />
                ) : (
                    <div className="space-y-6">
                    {Array.from(partidosPorCategoria.entries()).map(([nombreCat, partidosCat]) => {
                        const partidosGruposFase = partidosCat.filter((partido) => partido.fase === 'GRUPOS')
                        const eliminacion = partidosCat.filter((partido) => partido.fase === 'ELIMINACION')

                        // Agrupar partidos de grupo por nombre de grupo, pendientes primero
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

                        // Agrupar eliminatorias por ronda, pendientes primero
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
                                {Object.entries(porGrupo).map(([grupoNombre, partidosGrupo]) => (
                                    <GrupoPartidosColapsable key={grupoNombre} title={grupoNombre} count={partidosGrupo.length}>
                                        {ordenarPorEstado(partidosGrupo).map((partido) => (
                                        <FilaPartido key={partido.id} partido={partido} showResults={mostrarResultados} canSchedule={puedeProgramar} onStartMatch={manejarIniciarPartido} onLoadResult={manejarCargarResultado} onSchedule={manejarProgramarPartido} onDeclareWo={manejarDeclararWo} />
                                        ))}
                                    </GrupoPartidosColapsable>
                                ))}
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
                                        <FilaPartido key={partido.id} partido={partido} showResults={mostrarResultados} canSchedule={puedeProgramar} onStartMatch={manejarIniciarPartido} onLoadResult={manejarCargarResultado} onSchedule={manejarProgramarPartido} onDeclareWo={manejarDeclararWo} />
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
                )}
                </div>
            )}

            {pestana === 'grupos' && (
                <div className="mt-4">
                {gruposSeleccionados.length === 0 ? (
                    <StatusMessage type="empty" title="No hay grupos" description="Los grupos se crean al generar el sorteo." />
                ) : (
                    <div className="space-y-4">
                    {Object.entries(
                        gruposSeleccionados.reduce((acum: Record<string, GrupoResponse[]>, grupo) => {
                        const clave = grupo.categoriaNombre
                        if (!acum[clave]) acum[clave] = []
                        acum[clave].push(grupo)
                        return acum
                        }, {})
                    ).map(([nombreCat, gruposCat]) => (
                        <div key={nombreCat}>
                        <h3 className="mb-3 text-sm font-black uppercase tracking-[0.12em] text-rp-accent">{nombreCat}</h3>
                        <div className="grid gap-3">
                            {gruposCat.map((grupo) => (
                            <div key={grupo.id} className="rounded-lg border border-rp-border bg-rp-surface/82">
                                <button onClick={() => alternarGrupoExpandido(grupo.id)} className="flex w-full items-center justify-between p-4">
                                <span className="font-bold text-rp-text">{grupo.nombre}</span>
                                <ChevronDown size={16} className={`text-rp-muted transition-transform ${gruposExpandidos.has(grupo.id) ? 'rotate-180' : ''}`} />
                                </button>
                                {gruposExpandidos.has(grupo.id) && (
                                <div className="border-t border-rp-border px-4 py-3">
                                    <table className="w-full text-xs">
                                    <thead>
                                        <tr className="text-left text-rp-muted">
                                        <th className="pb-2 pr-2 font-bold">#</th>
                                        <th className="pb-2 pr-2 font-bold">Pareja</th>
                                        <th className="pb-2 pr-2 font-bold text-center">PJ</th>
                                        <th className="pb-2 pr-2 font-bold text-center">PG</th>
                                        <th className="pb-2 pr-2 font-bold text-center">PP</th>
                                        <th className="pb-2 pr-2 font-bold text-center">Sets</th>
                                        <th className="pb-2 pr-2 font-bold text-center">Juegos</th>
                                        <th className="pb-2 font-bold text-center">Pts</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {grupo.posiciones.map((pos) => (
                                        <tr key={pos.id} className="border-t border-rp-border/50">
                                            <td className="py-2 pr-2 font-bold text-rp-muted">{pos.posicion}</td>
                                            <td className="py-2 pr-2 text-rp-text">{pos.parejaNombre}</td>
                                            <td className="py-2 pr-2 text-center text-rp-muted">{pos.pj}</td>
                                            <td className="py-2 pr-2 text-center text-rp-muted">{pos.pg}</td>
                                            <td className="py-2 pr-2 text-center text-rp-muted">{pos.pp}</td>
                                            <td className="py-2 pr-2 text-center text-rp-muted">{pos.setsGanados}-{pos.setsPerdidos}</td>
                                            <td className="py-2 pr-2 text-center text-rp-muted">{pos.juegosGanados}-{pos.juegosPerdidos}</td>
                                            <td className="py-2 text-center font-bold text-rp-accent">{pos.puntos}</td>
                                        </tr>
                                        ))}
                                    </tbody>
                                    </table>
                                </div>
                                )}
                            </div>
                            ))}
                        </div>
                        </div>
                    ))}
                    </div>
                )}
                </div>
            )}

            <ConfirmDialog isOpen={confirmarSorteo} onClose={() => setConfirmarSorteo(false)} onConfirm={manejarSorteo}
                title="Generar sorteo" description={
                    `¿Generás el sorteo para "${torneo.nombre}"?\n${infoSorteo?.join('\n') ?? ''}\n\nSe crearán los partidos automáticamente.`
                }
                confirmLabel="Generar" isLoading={sorteando} />

            <ConfirmDialog isOpen={Boolean(parejaAEliminar)} onClose={() => setParejaAEliminar(null)} onConfirm={manejarEliminarPareja}
                title="Eliminar pareja" description={`¿Eliminás la pareja "${parejaAEliminar?.name}" del torneo?`} isLoading={eliminandoPareja} />

            <ConfirmDialog
                isOpen={Boolean(parejaARetirar)}
                onClose={() => setParejaARetirar(null)}
                onConfirm={async () => {
                    if (!parejaARetirar) return
                    setRetirandoPareja(true)
                    try {
                        await tournamentsApi.retirarPareja(id, parejaARetirar.id)
                        setParejaARetirar(null)
                        recargarDetalleYGrupos()
                        avisoExito('Pareja retirada. W.O. generados en sus partidos pendientes.')
                    } catch (e: unknown) { setErrorAccion(obtenerMensajeErrorApi(e)); setParejaARetirar(null) }
                    finally { setRetirandoPareja(false) }
                }}
                title="Retirar pareja del torneo"
                description={`¿Retirás la pareja "${parejaARetirar?.name}"? Se generará W.O. automático en todos sus partidos pendientes.`}
                isLoading={retirandoPareja} />

            <Modal isOpen={parejaAbierta} onClose={() => setParejaAbierta(false)} title="Inscribir pareja" size="sm">
                <div className="flex flex-col gap-4">
                <Select label="Categoría" value={formularioPareja.categoriaId.toString()} onChange={(e) => setFormularioPareja((f) => ({ ...f, categoriaId: Number(e.target.value), jugador1Id: 0, jugador2Id: 0 }))} placeholder="Seleccionar...">
                    {categoriasTorneo.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}
                </Select>
                <BuscadorJugador
                    label="Jugador 1"
                    jugadores={jugadoresPorGenero.filter((jugador) => jugador.id !== formularioPareja.jugador2Id)}
                    value={formularioPareja.jugador1Id}
                    onChange={(idJugador) => setFormularioPareja((f) => ({ ...f, jugador1Id: idJugador }))}
                />
                <BuscadorJugador
                    label="Jugador 2"
                    jugadores={jugadoresPorGenero.filter((jugador) => jugador.id !== formularioPareja.jugador1Id)}
                    value={formularioPareja.jugador2Id}
                    onChange={(idJugador) => setFormularioPareja((f) => ({ ...f, jugador2Id: idJugador }))}
                />
                {torneo?.tipoSorteo === 'CABEZAS_SERIE' || torneo?.tipoSorteo === 'COMBINADO' ? (
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-rp-muted">
                        <input type="checkbox" checked={formularioPareja.esCabezaDeSerie} onChange={(e) => setFormularioPareja((f) => ({ ...f, esCabezaDeSerie: e.target.checked }))} className="size-4 accent-rp-accent" />
                        Cabeza de serie
                    </label>
                ) : null}
                {errorPareja && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorPareja}</p>}
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => setParejaAbierta(false)} disabled={guardandoPareja}>Cancelar</Button>
                    <Button size="sm" onClick={manejarGuardarPareja} disabled={guardandoPareja}>{guardandoPareja ? 'Inscribiendo...' : 'Inscribir'}</Button>
                </div>
                </div>
            </Modal>

            <Modal isOpen={resultadoAbierto} onClose={() => setResultadoAbierto(false)} title="Cargar resultado" size="sm">
                {partidoResultado && (
                <div className="flex flex-col gap-4">
                    <div className="rounded-lg border border-rp-border bg-rp-bg/55 p-3 text-sm">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-rp-muted">{formatearEtapaPartido(partidoResultado)} · {partidoResultado.categoriaNombre}</p>
                    <p className="mt-2 font-bold text-rp-text">{formatearPareja(partidoResultado, 'local')}</p>
                    <p className="text-xs text-rp-muted">vs</p>
                    <p className="font-bold text-rp-text">{formatearPareja(partidoResultado, 'visitante')}</p>
                    {partidoResultado.fechaHora && <p className="mt-1 text-xs text-rp-muted">{formatearFechaHora(partidoResultado.fechaHora)}</p>}
                    </div>
                    <Input label='Marcador (ej: "6-3 / 4-6 / 7-5")' value={marcador} onChange={(e) => setMarcador(e.target.value)} placeholder="6-3 / 4-6 / 7-5" />
                    <p className="text-xs text-rp-muted">Sets separados por / (ej: 6-3 / 4-6 / 7-5). La pareja local gana si gana más sets.</p>
                    {errorResultado && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorResultado}</p>}
                    <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => setResultadoAbierto(false)} disabled={guardandoResultado}>Cancelar</Button>
                    <Button size="sm" onClick={manejarGuardarResultado} disabled={guardandoResultado}>{guardandoResultado ? 'Guardando...' : 'Guardar resultado'}</Button>
                    </div>
                </div>
                )}
            </Modal>

            <Modal isOpen={programacionAbierta} onClose={() => setProgramacionAbierta(false)} title="Programar partido" size="sm">
                {partidoProgramacion && (
                <div className="flex flex-col gap-4">
                    <div className="rounded-lg border border-rp-border bg-rp-bg/55 p-3 text-sm">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-rp-muted">{formatearEtapaPartido(partidoProgramacion)} · {partidoProgramacion.categoriaNombre}</p>
                    <p className="mt-2 font-bold text-rp-text">{formatearPareja(partidoProgramacion, 'local')} vs {formatearPareja(partidoProgramacion, 'visitante')}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-rp-muted">Fecha y hora</label>
                    <input
                        type="datetime-local"
                        value={fechaProgramacion}
                        onChange={(e) => setFechaProgramacion(e.target.value)}
                        className="rounded-md border border-rp-border bg-rp-bg px-3 py-2 text-sm text-rp-text focus:border-rp-accent focus:outline-none"
                    />
                    </div>
                    {errorProgramacion && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorProgramacion}</p>}
                    <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => setProgramacionAbierta(false)} disabled={guardandoProgramacion}>Cancelar</Button>
                    <Button size="sm" onClick={manejarGuardarProgramacion} disabled={guardandoProgramacion}>{guardandoProgramacion ? 'Guardando...' : 'Guardar programación'}</Button>
                    </div>
                </div>
                )}
            </Modal>

            <Modal isOpen={woAbierto} onClose={() => setWoAbierto(false)} title="Declarar W.O. / Retiro" size="sm">
                {partidoWo && (
                <div className="flex flex-col gap-4">
                    <div className="rounded-lg border border-rp-border bg-rp-bg/55 p-3 text-sm">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-rp-muted">{formatearEtapaPartido(partidoWo)} · {partidoWo.categoriaNombre}</p>
                    <p className="mt-2 font-bold text-rp-text">{formatearPareja(partidoWo, 'local')} vs {formatearPareja(partidoWo, 'visitante')}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-rp-muted">Tipo</label>
                    <select value={woTipo} onChange={(e) => setWoTipo(e.target.value as 'WALKOVER' | 'RETIRO')} className="rounded-md border border-rp-border bg-rp-bg px-3 py-2 text-sm text-rp-text focus:border-rp-accent focus:outline-none">
                        <option value="WALKOVER">W.O. (no se presentó — sin puntos)</option>
                        <option value="RETIRO">Retiro (abandonó en juego — ganador recibe puntos)</option>
                    </select>
                    </div>
                    <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-rp-muted">Pareja ganadora</label>
                    <select value={woGanadorId} onChange={(e) => setWoGanadorId(Number(e.target.value))} className="rounded-md border border-rp-border bg-rp-bg px-3 py-2 text-sm text-rp-text focus:border-rp-accent focus:outline-none">
                        <option value={0}>— Seleccionar —</option>
                        {partidoWo.parejaLocalId && <option value={partidoWo.parejaLocalId}>{formatearPareja(partidoWo, 'local')}</option>}
                        {partidoWo.parejaVisitanteId && <option value={partidoWo.parejaVisitanteId}>{formatearPareja(partidoWo, 'visitante')}</option>}
                    </select>
                    </div>
                    <Input label="Motivo (opcional)" value={woMotivo} onChange={(e) => setWoMotivo(e.target.value)} placeholder="Ej: lesión, ausencia justificada..." />
                    {errorWo && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorWo}</p>}
                    <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => setWoAbierto(false)} disabled={guardandoWo}>Cancelar</Button>
                    <Button size="sm" variant="danger" onClick={manejarGuardarWo} disabled={guardandoWo}>{guardandoWo ? 'Guardando...' : 'Confirmar'}</Button>
                    </div>
                </div>
                )}
            </Modal>
        </section>
    )
}

function BuscadorJugador({ label, onChange, jugadores, value }: {
    label: string
    jugadores: JugadorResponse[]
    value: number
    onChange: (id: number) => void
}) {
    const [consulta, setConsulta] = useState('')
    const [abierto, setAbierto] = useState(false)

    const seleccionado = jugadores.find((jugador) => jugador.id === value)
    const filtrados = jugadores
        .filter((jugador) => !consulta || `${jugador.nombre} ${jugador.apellido}`.toLowerCase().includes(consulta.toLowerCase()))
        .slice(0, 8)

    return (
        <div>
            <label className="mb-1 block text-xs font-bold text-rp-muted">{label}</label>
            {seleccionado && !abierto && (
                <button
                    type="button"
                    className="mb-1 flex w-full items-center justify-between rounded-lg border border-rp-accent/40 bg-rp-accent/10 px-3 py-2 text-sm"
                    onClick={() => { setConsulta(''); setAbierto(true) }}
                >
                    <span>
                        <span className="font-bold text-rp-text">{seleccionado.nombre} {seleccionado.apellido}</span>
                        {seleccionado.categoriaNombre && <span className="ml-2 text-xs text-rp-muted">{seleccionado.categoriaNombre}</span>}
                    </span>
                    <span className="text-xs text-rp-muted">Cambiar</span>
                </button>
            )}
            {(!seleccionado || abierto) && (
                <>
                    <input
                        className="h-10 w-full rounded-lg border border-rp-border bg-rp-surface/82 px-3 text-sm text-rp-text placeholder:text-rp-muted focus:border-rp-accent focus:outline-none"
                        placeholder="Buscar jugador por nombre..."
                        value={consulta}
                        autoFocus={abierto}
                        onChange={(e) => { setConsulta(e.target.value); setAbierto(true) }}
                        onFocus={() => setAbierto(true)}
                        onBlur={() => setTimeout(() => setAbierto(false), 160)}
                    />
                    {/* Dropdown INLINE (no absolute) para no quedar cortado por el modal */}
                    {abierto && (
                        <div className="mt-1 overflow-hidden rounded-lg border border-rp-border bg-rp-surface">
                            {filtrados.length === 0 ? (
                                <p className="px-3 py-2 text-xs text-rp-muted">
                                    {consulta ? `Sin resultados para "${consulta}"` : 'Escribí para buscar...'}
                                </p>
                            ) : (
                                <div className="max-h-36 overflow-y-auto">
                                    {filtrados.map((jugador) => (
                                        <button
                                            key={jugador.id}
                                            type="button"
                                            className={`w-full px-3 py-2 text-left hover:bg-rp-surface-2 ${jugador.id === value ? 'bg-rp-accent/10' : ''}`}
                                            onMouseDown={(e) => { e.preventDefault(); onChange(jugador.id); setConsulta(''); setAbierto(false) }}
                                        >
                                            <div className="text-sm font-bold text-rp-text">{jugador.nombre} {jugador.apellido}</div>
                                            {jugador.categoriaNombre && <div className="text-xs text-rp-muted">{jugador.categoriaNombre}</div>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

const TarjetaDato = memo(function TarjetaDato({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border border-rp-border bg-rp-surface/82 p-5 text-center">
            <strong className="block text-2xl font-black text-rp-accent">{value}</strong>
            <span className="mt-2 block text-xs font-bold text-rp-muted">{label}</span>
        </div>
    )
})

function GrupoPartidosColapsable({ title, count, children }: { title: string; count: number; children: ReactNode }) {
    const [abierto, setAbierto] = useState(false)
    return (
        <div>
            <button type="button" onClick={() => setAbierto((v) => !v)} className="mb-1 flex w-full items-center gap-2 text-xs font-bold text-rp-accent/80 hover:text-rp-accent">
                <ChevronDown size={13} className={`transition-transform ${abierto ? '' : '-rotate-90'}`} />
                {title}
                <span className="font-normal text-rp-muted">({count})</span>
            </button>
            {abierto && <div className="grid gap-2">{children}</div>}
        </div>
    )
}

const FilaPartido = memo(function FilaPartido({ partido, showResults, canSchedule, onStartMatch, onLoadResult, onSchedule, onDeclareWo }: {
    partido: PartidoResponse
    showResults: boolean
    canSchedule: boolean
    onStartMatch: (id: number) => void
    onLoadResult: (p: PartidoResponse) => void
    onSchedule: (p: PartidoResponse) => void
    onDeclareWo: (p: PartidoResponse) => void
}) {
    const [expandido, setExpandido] = useState(false)
    const esPendiente = partido.estado === 'PENDIENTE'
    const esEnCurso = partido.estado === 'EN_CURSO'
    const esTerminal = ['FINALIZADO', 'BYE', 'WALKOVER', 'RETIRO'].includes(partido.estado)
    const tonoBadge = esEnCurso ? 'live' : partido.estado === 'FINALIZADO' ? 'success' : partido.estado === 'BYE' || partido.estado === 'WALKOVER' || partido.estado === 'RETIRO' ? 'neutral' : 'neutral'
    return (
        <article className="rounded-lg border border-rp-border bg-rp-surface/82">
            <div className="flex items-center justify-between gap-4 p-5">
                <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={tonoBadge}>
                    {formatearEstadoPartido(partido.estado)}
                    </StatusBadge>
                    <span className="text-xs text-rp-muted">{formatearEtapaPartido(partido)}</span>
                    <span className="text-xs text-rp-muted">{partido.categoriaNombre}</span>
                </div>
                <p className="mt-3 truncate text-sm font-bold text-rp-text">{formatearPareja(partido, 'local')} vs {formatearPareja(partido, 'visitante')}</p>
                {partido.marcador && <p className="mt-2 text-sm font-black text-rp-accent">{partido.marcador}</p>}
                {!partido.marcador && (partido.fechaHoraProgramada || partido.fechaHora) && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-rp-muted">
                    <Clock size={11} />{formatearFechaPartido(partido)}
                    {partido.canchaNombre && <span>· {partido.canchaNombre}</span>}
                    </p>
                )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                {esPendiente && showResults && (
                    <button onClick={() => onStartMatch(partido.id)} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent" title="Iniciar partido">
                    <Play size={15} />
                    </button>
                )}
                {!esTerminal && canSchedule && (
                    <button onClick={() => onSchedule(partido)} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent" title="Programar fecha y hora">
                    <CalendarDays size={15} />
                    </button>
                )}
                {(esPendiente || esEnCurso) && showResults && (
                    <>
                    <Button size="sm" variant="subtle" onClick={() => onLoadResult(partido)}>
                    Resultado
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onDeclareWo(partido)}>
                    W.O.
                    </Button>
                    </>
                )}
                <button onClick={() => setExpandido(!expandido)} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2">
                    <ChevronDown size={15} className={`transition-transform ${expandido ? 'rotate-180' : ''}`} />
                </button>
                </div>
            </div>
            {expandido && (
                <div className="grid gap-2 border-t border-rp-border px-5 py-4 text-xs text-rp-muted sm:grid-cols-2">
                <span>Lugar: {partido.lugarNombre ?? '—'}</span>
                {partido.canchaNombre && <span>Cancha: {partido.canchaNombre}</span>}
                <span>Programado: {formatearFechaHora(partido.fechaHoraProgramada)}</span>
                <span>Jugado: {formatearFechaHora(partido.fechaHora)}</span>
                <span>Fase: {formatearEnum(partido.fase)}</span>
                {partido.ganadorNombre && <span className="font-bold text-rp-text">Ganador: {partido.ganadorNombre}</span>}
                </div>
            )}
        </article>
    )
})
