import { ArrowLeft, ClipboardList, Settings, Shuffle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, useParams, useSearchParams } from 'react-router-dom'

import { categoriesApi } from '@/features/catalog/catalogApi'
import { playersApi } from '@/features/players/playersApi'
import { tournamentsApi } from '@/features/tournaments/tournamentsApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { useToast } from '@/shared/ui/Toast'
import { formatearFecha, formatearEnum, formatearEtapaPartido, formatearPareja, formatearMoneda } from '@/shared/lib/formatters'
import type {
    CategoriaResponse,
    CrucePreviewResponse,
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

import { BuscadorJugador } from './tournament-detail/BuscadorJugador'
import { GruposTab } from './tournament-detail/GruposTab'
import { ParejasTab } from './tournament-detail/ParejasTab'
import { PartidosTab } from './tournament-detail/PartidosTab'
import { TarjetaDato } from './tournament-detail/TarjetaDato'

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

    const [searchParams] = useSearchParams()
    const [pestana, setPestana] = useState<'resumen' | 'parejas' | 'partidos' | 'grupos'>(() => {
        const forzada = searchParams.get('vista')
        if (forzada === 'resumen' || forzada === 'parejas' || forzada === 'partidos' || forzada === 'grupos') return forzada
        const guardada = localStorage.getItem(`rp-admin-torneo-${id}-pestana`)
        return guardada === 'parejas' || guardada === 'partidos' || guardada === 'grupos' ? guardada : 'resumen'
    })
    const [nombreCategoriaSeleccionada, setNombreCategoriaSeleccionada] = useState(() => localStorage.getItem(`rp-admin-torneo-${id}-categoria`) ?? '')
    const [cambiandoEstado, setCambiandoEstado] = useState(false)
    const [retrocediendo, setRetrocediendo] = useState(false)
    const [confirmarSorteo, setConfirmarSorteo] = useState(false)
    const [sorteando, setSorteando] = useState(false)

    const [parejaAbierta, setParejaAbierta] = useState(false)
    const [parejaEditandoId, setParejaEditandoId] = useState<number | null>(null)
    const [formularioPareja, setFormularioPareja] = useState<ParejaRequest>(PAREJA_VACIA)
    const [errorPareja, setErrorPareja] = useState<string | null>(null)
    const [guardandoPareja, setGuardandoPareja] = useState(false)
    const [parejaAEliminar, setParejaAEliminar] = useState<{ id: number; name: string } | null>(null)
    const [eliminandoPareja, setEliminandoPareja] = useState(false)
    const [parejaARetirar, setParejaARetirar] = useState<{ id: number; name: string } | null>(null)
    const [retirandoPareja, setRetirandoPareja] = useState(false)

    const [woAbierto, setWoAbierto] = useState(false)
    const [partidoWo, setPartidoWo] = useState<PartidoResponse | null>(null)
    const [woGanadorId, setWoGanadorId] = useState<number>(0)
    const [woTipo, setWoTipo] = useState<'WALKOVER' | 'RETIRO'>('WALKOVER')
    const [woMotivo, setWoMotivo] = useState('')
    const [errorWo, setErrorWo] = useState<string | null>(null)
    const [guardandoWo, setGuardandoWo] = useState(false)

    const [cruces, setCruces] = useState<CrucePreviewResponse[]>([])
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

    useEffect(() => {
        if (!detalle) { setCruces([]); return }
        const nombre = nombreCategoriaSeleccionada || detalle.torneo.categorias[0]?.nombre
        const categoria = detalle.torneo.categorias.find((c) => c.nombre === nombre)
        if (!categoria) { setCruces([]); return }
        tournamentsApi.getCuadroPreview(id, categoria.id).then(setCruces).catch(() => setCruces([]))
    }, [id, nombreCategoriaSeleccionada, detalle])

    useEffect(() => { localStorage.setItem(`rp-admin-torneo-${id}-pestana`, pestana) }, [id, pestana])
    useEffect(() => {
        if (nombreCategoriaSeleccionada) localStorage.setItem(`rp-admin-torneo-${id}-categoria`, nombreCategoriaSeleccionada)
    }, [id, nombreCategoriaSeleccionada])

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

    async function manejarGuardarPareja(continuar = false) {
        if (!formularioPareja.jugador1Id || !formularioPareja.jugador2Id || !formularioPareja.categoriaId) { setErrorPareja('Seleccioná ambos jugadores y la categoría.'); return }
        if (formularioPareja.jugador1Id === formularioPareja.jugador2Id) { setErrorPareja('Los jugadores deben ser distintos.'); return }
        setGuardandoPareja(true); setErrorPareja(null)
        try {
            if (parejaEditandoId != null) {
                await tournamentsApi.editPair(id, parejaEditandoId, formularioPareja)
                avisoExito('Pareja actualizada')
            } else {
                await tournamentsApi.addPair(id, formularioPareja)
                avisoExito('Pareja inscripta')
            }
            recargarDetalle()
            if (continuar && parejaEditandoId == null) {
                setFormularioPareja((f) => ({ ...f, jugador1Id: 0, jugador2Id: 0, esCabezaDeSerie: false }))
                setErrorPareja(null)
            } else {
                setParejaAbierta(false); setParejaEditandoId(null); setFormularioPareja(PAREJA_VACIA)
            }
        }
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

    const manejarSubmitResultado = useCallback(async (partido: PartidoResponse, marcadorPartido: string) => {
        await tournamentsApi.loadResult(id, partido.id, { marcador: marcadorPartido })
        avisoExito('Resultado cargado')
        recargarDetalleYGrupos()
    }, [id])

    const manejarCorregirResultado = useCallback(async (partido: PartidoResponse, marcadorPartido: string) => {
        await tournamentsApi.correctResult(id, partido.id, { marcador: marcadorPartido })
        avisoExito('Resultado corregido')
        recargarDetalleYGrupos()
    }, [id])

    const manejarProgramarPartido = useCallback(async (partido: PartidoResponse, fechaHora: string) => {
        await tournamentsApi.scheduleMatch(id, partido.id, { fechaHora })
        avisoExito('Partido programado')
        recargarDetalle()
    }, [id])

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

    const datosDetalle = detalle
    const torneo = datosDetalle?.torneo ?? null
    const parejas = datosDetalle?.parejas ?? []
    const partidos = datosDetalle?.partidos ?? []
    const nombresCategorias = torneo?.categorias.map((categoria) => categoria.nombre) ?? []
    const categoriaActiva = nombreCategoriaSeleccionada || nombresCategorias[0] || ''
    const parejasSeleccionadas = categoriaActiva ? parejas.filter((pareja) => pareja.categoriaNombre === categoriaActiva) : parejas
    const partidosSeleccionados = categoriaActiva ? partidos.filter((partido) => partido.categoriaNombre === categoriaActiva) : partidos
    const gruposSeleccionados = categoriaActiva ? grupos.filter((grupo) => grupo.categoriaNombre === categoriaActiva) : grupos
    const campeonCategoria = (datosDetalle?.campeones ?? []).find((c) => c.categoriaNombre === categoriaActiva)
    const pendientes = partidosSeleccionados.filter((partido) => partido.estado === 'PENDIENTE' || partido.estado === 'EN_CURSO')
    const finalizados = partidosSeleccionados.filter((partido) => partido.estado === 'FINALIZADO')

    const puedeInscribir = torneo?.estado === 'INSCRIPCION'
    const mostrarSorteo = torneo ? puedeSortear(torneo.estado, parejas.length, partidos.length) : false
    const mostrarResultados = torneo ? puedeCargarResultados(torneo.estado, pendientes.length) : false
    const puedeEditarResultados = torneo?.estado === 'EN_CURSO'
    const puedeProgramar = torneo ? (torneo.estado === 'SORTEADO' || torneo.estado === 'EN_CURSO') : false
    const categoriasTorneo = torneo ? todasCategorias.filter((categoria) => torneo.categorias.some((tc) => tc.id === categoria.id)) : []

    const infoSorteo = useMemo(() => {
        if (!mostrarSorteo || !torneo) return null
        return categoriasTorneo.map((categoria) => {
            const cantidad = parejas.filter((pareja) => pareja.categoriaNombre === categoria.nombre).length
            const cupo = torneo.cuposPorCategoria?.[categoria.id] ?? null
            let detalle = ''
            if (cantidad < 2) detalle = ' — ⚠ faltan parejas (mínimo 2 para sortear)'
            else if (cupo && cantidad < cupo) detalle = ` — de ${cupo} del cupo (se juega igual, con BYE si hace falta)`
            else if (cupo && cantidad >= cupo) detalle = ' — cupo completo'
            return `${categoria.nombre}: ${cantidad} parejas${detalle}`
        })
    }, [mostrarSorteo, categoriasTorneo, parejas, torneo])

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
                    <Button size="sm" variant="ghost" asChild>
                        <NavLink to={`/admin/torneos/${torneoId}/inscripciones`}><ClipboardList size={15} />Inscripciones</NavLink>
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                        <NavLink to={`/admin/torneos/${torneoId}/editar`}><Settings size={15} />Configuración</NavLink>
                    </Button>
                </div>
                </div>
                {errorAccion && <p className="mt-4 rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorAccion}</p>}
            </div>

            {nombresCategorias.length > 0 && (
                <div className="mt-4 max-w-xs">
                    <Select label="Categoría gestionada" value={categoriaActiva} onChange={(e) => setNombreCategoriaSeleccionada(e.target.value)}>
                        {nombresCategorias.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
                    </Select>
                </div>
            )}

            <div className="mt-6 flex gap-1 rounded-lg border border-rp-border bg-rp-surface/82 p-1">
                {(['resumen', 'parejas', 'partidos', 'grupos'] as const).map((p) => (
                <button key={p} onClick={() => setPestana(p)} className={`flex-1 rounded-md py-2 text-sm font-bold transition ${pestana === p ? 'bg-rp-surface-2 text-rp-accent' : 'text-rp-muted hover:text-rp-text'}`}>
                    {p === 'resumen' ? 'Resumen' : p === 'parejas' ? 'Parejas' : p === 'partidos' ? 'Partidos' : 'Grupos'}
                </button>
                ))}
            </div>

            {pestana === 'resumen' && (
                <div className="mt-4 flex flex-col gap-4">
                    <div className="rounded-lg border border-rp-border bg-rp-surface/82 p-5">
                        <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                            <FilaResumen emoji="📊" clave="Estado" valor={formatearEnum(torneo.estado)} />
                            <FilaResumen emoji="🎾" clave="Formato" valor={formatearEnum(torneo.formato)} />
                            <FilaResumen emoji="📍" clave="Lugar" valor={torneo.lugarNombre ?? 'Sin lugar'} />
                            <FilaResumen emoji="📅" clave="Inicio" valor={formatearFecha(torneo.fechaInicio)} />
                            {torneo.fechaFin ? <FilaResumen emoji="🏁" clave="Fin" valor={formatearFecha(torneo.fechaFin)} /> : null}
                            <FilaResumen emoji="👥" clave="Parejas" valor={String(parejas.length)} />
                            <FilaResumen emoji="⚔️" clave="Partidos" valor={String(partidos.length)} />
                            {torneo.premioAcumulado ? <FilaResumen emoji="🏆" clave="Premio" valor={formatearMoneda(torneo.premioAcumulado)} /> : null}
                            {torneo.temporadaNombre ? <FilaResumen emoji="🗓️" clave="Temporada" valor={torneo.temporadaNombre} /> : null}
                            <FilaResumen emoji="⭐" clave="Suma ranking" valor={torneo.sumaPuntosRanking ? 'Sí' : 'No'} />
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <span className="text-sm">🏅</span>
                            {torneo.categorias.map((categoria) => (
                                <StatusBadge key={categoria.id} tone="neutral">{categoria.nombre}</StatusBadge>
                            ))}
                        </div>
                    </div>

                    {(torneo.configuracionesCategoria ?? []).length > 0 && (
                        <div className="rounded-lg border border-rp-border bg-rp-surface/82 p-5">
                            <p className="text-xs font-black uppercase tracking-[0.12em] text-rp-accent">Formato por categoría</p>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                {(torneo.configuracionesCategoria ?? []).map((config) => (
                                    <div key={config.categoriaId} className="rounded-md border border-rp-border bg-rp-bg/55 px-3 py-2">
                                        <p className="text-sm font-bold text-rp-text">{config.categoriaNombre ?? `Categoría ${config.categoriaId}`}</p>
                                        <p className="mt-1 text-xs text-rp-muted">
                                            {formatearEnum(config.formato)} · {formatearEnum(config.tipoSorteo)} · al mejor de {config.mejorDeSets ?? 3}
                                            {config.cupo ? ` · cupo ${config.cupo}` : ''}
                                        </p>
                                        <p className="text-xs text-rp-muted">
                                            {config.incluyeFaseGrupos ? 'Con grupos' : 'Sin grupos'} · {config.incluyeEliminacion ? 'con eliminación' : 'sin eliminación'}
                                            {config.plantillaPuntosNombre ? ` · puntos: ${config.plantillaPuntosNombre}` : ''}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <TarjetaDato label={`Parejas ${categoriaActiva ? `(${categoriaActiva})` : ''}`} value={parejasSeleccionadas.length} />
                        <TarjetaDato label={`Partidos ${categoriaActiva ? `(${categoriaActiva})` : ''}`} value={partidosSeleccionados.length} />
                        <TarjetaDato label="Pendientes" value={pendientes.length} />
                        <TarjetaDato label="Finalizados" value={finalizados.length} />
                    </div>

                    {torneo.estado === 'FINALIZADO' && (
                        <div className="rounded-lg border border-rp-border bg-rp-surface/82 p-4">
                            <p className="text-xs font-black uppercase tracking-[0.12em] text-rp-accent">Resultado final de {categoriaActiva}</p>
                            <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                                <span className="font-bold text-rp-text">Campeón: {campeonCategoria?.campeonaNombre ?? 'Sin dato'}</span>
                                <span className="font-bold text-rp-muted">Subcampeón: {campeonCategoria?.subcampeonaNombre ?? 'Sin dato'}</span>
                            </div>
                        </div>
                    )}

                    {cruces.length > 0 && (
                        <div className="rounded-lg border border-rp-border bg-rp-surface/82 p-4">
                            <p className="text-xs font-black uppercase tracking-[0.12em] text-rp-accent">Cómo se arma el cuadro · {categoriaActiva}</p>
                            <p className="mt-1 text-xs text-rp-muted">Al terminar la fase de grupos, los clasificados se cruzan así. La posición de cada pareja depende de cómo quede la tabla.</p>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                {cruces.map((cruce, i) => (
                                    <div key={i} className="flex items-center justify-between gap-2 rounded-md border border-rp-border bg-rp-bg/55 px-3 py-2 text-sm">
                                        <span className="font-bold text-rp-text">{cruce.local}</span>
                                        <span className="text-xs font-black uppercase text-rp-muted">vs</span>
                                        <span className="font-bold text-rp-text">{cruce.visitante}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-2 text-xs text-rp-muted">{cruces[0].ronda} · los ganadores avanzan hasta la final.</p>
                        </div>
                    )}
                </div>
            )}

            {pestana === 'parejas' && (
                <ParejasTab
                    parejas={parejasSeleccionadas}
                    puedeInscribir={puedeInscribir}
                    estadoTorneo={torneo?.estado}
                    onOpenInscribir={() => { setParejaEditandoId(null); setFormularioPareja(PAREJA_VACIA); setErrorPareja(null); setParejaAbierta(true) }}
                    onEditar={(pareja) => {
                        setFormularioPareja({
                            jugador1Id: pareja.jugador1Id ?? 0,
                            jugador2Id: pareja.jugador2Id ?? 0,
                            categoriaId: pareja.categoriaId ?? 0,
                            esCabezaDeSerie: pareja.esCabezaDeSerie,
                        })
                        setParejaEditandoId(pareja.id)
                        setErrorPareja(null)
                        setParejaAbierta(true)
                    }}
                    onEliminar={(pareja) => setParejaAEliminar(pareja)}
                    onRetirar={(pareja) => setParejaARetirar(pareja)}
                />
            )}

            {pestana === 'partidos' && (
                <div className="mt-4">
                    <PartidosTab
                        key={categoriaActiva}
                        partidos={partidosSeleccionados}
                        parejas={parejasSeleccionadas}
                        torneo={torneo}
                        mostrarSorteo={mostrarSorteo}
                        showResults={mostrarResultados}
                        canSchedule={puedeProgramar}
                        canEditResult={puedeEditarResultados}
                        onStartMatch={manejarIniciarPartido}
                        onSubmitResult={manejarSubmitResultado}
                        onCorrectResult={manejarCorregirResultado}
                        onSchedule={manejarProgramarPartido}
                        onDeclareWo={manejarDeclararWo}
                    />
                </div>
            )}

            {pestana === 'grupos' && (
                <div className="mt-4">
                    <GruposTab grupos={gruposSeleccionados} />
                </div>
            )}

            <ConfirmDialog isOpen={confirmarSorteo} onClose={() => setConfirmarSorteo(false)} onConfirm={manejarSorteo}
                title="Generar sorteo" description={
                    `¿Generás el sorteo para "${torneo.nombre}"?\n${infoSorteo?.join('\n') ?? ''}\n\nSe crearán los partidos automáticamente. Si una categoría no llegó al cupo, el torneo se juega igual con las parejas anotadas.`
                }
                confirmLabel="Generar" tono="normal" loadingLabel="Generando..." isLoading={sorteando} />

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

            <Modal isOpen={parejaAbierta} onClose={() => { setParejaAbierta(false); setParejaEditandoId(null) }} title={parejaEditandoId != null ? 'Editar pareja' : 'Inscribir pareja'} size="sm">
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
                {torneo?.tipoSorteo === 'CABEZAS_SERIE' ? (
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-rp-muted">
                        <input type="checkbox" checked={formularioPareja.esCabezaDeSerie} onChange={(e) => setFormularioPareja((f) => ({ ...f, esCabezaDeSerie: e.target.checked }))} className="size-4 accent-rp-accent" />
                        Cabeza de serie
                    </label>
                ) : null}
                {errorPareja && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorPareja}</p>}
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => { setParejaAbierta(false); setParejaEditandoId(null) }} disabled={guardandoPareja}>Cancelar</Button>
                    <Button variant={parejaEditandoId == null ? 'subtle' : 'primary'} size="sm" onClick={() => manejarGuardarPareja(false)} disabled={guardandoPareja}>{guardandoPareja ? 'Guardando...' : parejaEditandoId != null ? 'Guardar cambios' : 'Inscribir'}</Button>
                    {parejaEditandoId == null && (
                    <Button size="sm" onClick={() => manejarGuardarPareja(true)} disabled={guardandoPareja}>{guardandoPareja ? 'Guardando...' : 'Inscribir y agregar otra'}</Button>
                    )}
                </div>
                </div>
            </Modal>

            <Modal isOpen={woAbierto} onClose={() => setWoAbierto(false)} onSubmit={manejarGuardarWo} title="Declarar W.O. / Retiro" size="sm">
                {partidoWo && (
                <div className="flex flex-col gap-4">
                    <div className="rounded-lg border border-rp-border bg-rp-bg/55 p-3 text-sm">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-rp-muted">{formatearEtapaPartido(partidoWo)} · {partidoWo.categoriaNombre}</p>
                    <p className="mt-2 font-bold text-rp-text">{formatearPareja(partidoWo, 'local')} vs {formatearPareja(partidoWo, 'visitante')}</p>
                    </div>
                    <Select label="Tipo" value={woTipo} onChange={(e) => setWoTipo(e.target.value as 'WALKOVER' | 'RETIRO')}>
                        <option value="WALKOVER">W.O. (no se presentó — sin puntos)</option>
                        <option value="RETIRO">Retiro (abandonó en juego — ganador recibe puntos)</option>
                    </Select>
                    <Select label="Pareja ganadora" value={woGanadorId} onChange={(e) => setWoGanadorId(Number(e.target.value))}>
                        <option value={0}>— Seleccionar —</option>
                        {partidoWo.parejaLocalId && <option value={partidoWo.parejaLocalId}>{formatearPareja(partidoWo, 'local')}</option>}
                        {partidoWo.parejaVisitanteId && <option value={partidoWo.parejaVisitanteId}>{formatearPareja(partidoWo, 'visitante')}</option>}
                    </Select>
                    <Input label="Motivo (opcional)" value={woMotivo} onChange={(e) => setWoMotivo(e.target.value)} placeholder="Ej: lesión, ausencia justificada..." />
                    {errorWo && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorWo}</p>}
                    <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => setWoAbierto(false)} disabled={guardandoWo}>Cancelar</Button>
                    <Button type="submit" size="sm" variant="danger" disabled={guardandoWo}>{guardandoWo ? 'Guardando...' : 'Confirmar'}</Button>
                    </div>
                </div>
                )}
            </Modal>
        </section>
    )
}

function FilaResumen({ emoji, clave, valor }: { emoji: string; clave: string; valor: string }) {
    return (
        <div className="flex items-center justify-between gap-3 border-b border-rp-border/50 py-2">
            <span className="flex items-center gap-2 text-sm text-rp-muted"><span>{emoji}</span>{clave}</span>
            <span className="text-right text-sm font-bold text-rp-text">{valor}</span>
        </div>
    )
}
