import './TournamentDetailPage.css'
import { ArrowLeft, CalendarDays, Check, ChevronLeft, ChevronRight, CircleDot, ClipboardList, GitBranch, ListChecks, MapPin, Medal, NotebookPen, Table2, Trophy } from 'lucide-react'
import { memo, useEffect, useMemo, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'

import { tournamentsApi } from '@/features/tournaments/tournamentsApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { formatearFecha, formatearEnum, formatearEstadoPartido, formatearPareja, formatearNombreRonda, formatearFechaPartido, formatearMoneda, metaPartido } from '@/shared/lib/formatters'
import { construirRondasCuadro } from '@/shared/lib/bracket'
import { ordenarCategorias } from '@/shared/lib/categorias'
import { parsearMarcador, type SetMarcador } from '@/shared/lib/score'
import { obtenerPartidoCampeon, obtenerNombreSubcampeon, obtenerCampeonLiga, gruposPorCategoria, partidosPorCategoria, parejasPorCategoria, ordenarPartidosCuadro } from '@/shared/lib/tournamentView'
import type { GrupoResponse, PartidoResponse, TorneoDetalleResponse } from '@/shared/types/api'
import { Button } from '@/shared/ui/Button'
import { BracketCuadro } from '@/shared/ui/BracketCuadro'
import { NombreParejaApilado } from '@/shared/ui/NombreParejaApilado'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { StatusMessage } from '@/shared/ui/StatusMessage'

export default function TournamentDetailPage() {
  const { torneoId } = useParams()
  const torneoIdNumerico = Number(torneoId)
  const torneoIdValido = Number.isFinite(torneoIdNumerico)
  const [detalle, setDetalle] = useState<TorneoDetalleResponse | null>(null)
  const [grupos, setGrupos] = useState<GrupoResponse[]>([])
  const [calendario, setCalendario] = useState<PartidoResponse[]>([])
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(() => localStorage.getItem(`rp-torneo-${torneoIdNumerico}-categoria`) ?? '')
  const [indiceProximos, setIndiceProximos] = useState(0)
  const [cargando, setCargando] = useState(torneoIdValido)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let montado = true

    if (!torneoIdValido) return

    Promise.all([
      tournamentsApi.getDetail(torneoIdNumerico),
      tournamentsApi.getGroups(torneoIdNumerico).catch(() => []),
      tournamentsApi.getCalendario(torneoIdNumerico).catch(() => []),
    ])
      .then(([datosDetalle, datosGrupos, datosCalendario]) => {
        if (!montado) return
        setDetalle(datosDetalle)
        setGrupos(datosGrupos)
        setCalendario(datosCalendario)
        const nombresCategorias = ordenarCategorias(datosDetalle.torneo.categorias).map((categoria) => categoria.nombre)
        setCategoriaSeleccionada((previa) => (nombresCategorias.includes(previa) ? previa : (nombresCategorias[0] ?? '')))
        setError(null)
      })
      .catch((errorCapturado: unknown) => {
        if (!montado) return
        setError(obtenerMensajeErrorApi(errorCapturado))
      })
      .finally(() => {
        if (!montado) return
        setCargando(false)
      })

    return () => {
      montado = false
    }
  }, [torneoIdValido, torneoIdNumerico])

  const datosVista = useMemo(() => {
    if (!detalle) return null
    const mapaParejas = parejasPorCategoria(detalle.parejas)
    const mapaPartidos = partidosPorCategoria(detalle.partidos)
    const mapaGrupos = gruposPorCategoria(grupos)
    const categorias = ordenarCategorias(detalle.torneo.categorias).map((categoria) => categoria.nombre)
    const categoriaPorDefecto = categorias[0] ?? Object.keys(mapaPartidos)[0] ?? Object.keys(mapaParejas)[0] ?? ''
    const categoria = categoriaSeleccionada || categoriaPorDefecto

    return {
      categorias,
      categoria,
      parejas: mapaParejas[categoria] ?? [],
      partidos: mapaPartidos[categoria] ?? [],
      grupos: mapaGrupos[categoria] ?? [],
    }
  }, [detalle, grupos, categoriaSeleccionada])

  const tramosProximos = useMemo(() => {
    if (calendario.length === 0 || !detalle) return []
    const esLiga = detalle.torneo.formato === 'LIGA'
    const categoriaActiva = categoriaSeleccionada || ordenarCategorias(detalle.torneo.categorias)[0]?.nombre || ''
    const propios = calendario.filter((partido) => !categoriaActiva || partido.categoriaNombre === categoriaActiva)
    const mapa = new Map<string, { etiqueta: string; orden: number; partidos: PartidoResponse[] }>()
    for (const partido of propios) {
      let clave: string
      let etiqueta: string
      let orden: number
      if (esLiga && partido.jornada != null) {
        clave = `fecha-${partido.jornada}`
        etiqueta = `Fecha ${partido.jornada}`
        orden = partido.jornada
      } else if (partido.fase === 'GRUPOS' && partido.grupoNombre) {
        clave = partido.grupoNombre
        etiqueta = partido.grupoNombre
        orden = 100
      } else if (partido.fase === 'ELIMINACION') {
        const ronda = formatearNombreRonda(partido.ronda) ?? 'Eliminatorias'
        clave = `ronda-${ronda}`
        etiqueta = ronda
        orden = 1000 + (partido.rondaOrden ?? 0)
      } else {
        clave = 'otros'
        etiqueta = 'Próximos'
        orden = 2000
      }
      if (!mapa.has(clave)) mapa.set(clave, { etiqueta, orden, partidos: [] })
      mapa.get(clave)!.partidos.push(partido)
    }
    return Array.from(mapa.values()).sort((a, b) => a.orden - b.orden)
  }, [calendario, detalle, categoriaSeleccionada])

  useEffect(() => { setIndiceProximos(0) }, [categoriaSeleccionada])

  useEffect(() => {
    if (categoriaSeleccionada) localStorage.setItem(`rp-torneo-${torneoIdNumerico}-categoria`, categoriaSeleccionada)
  }, [torneoIdNumerico, categoriaSeleccionada])

  if (cargando) {
    return <section className="tournament-detail-page"><StatusMessage title="Cargando detalle del torneo" type="loading" /></section>
  }

  if (!torneoIdValido) {
    return <section className="tournament-detail-page"><StatusMessage title="El ID del torneo no es válido" type="error" /></section>
  }

  if (error || !detalle || !datosVista) {
    return <section className="tournament-detail-page"><StatusMessage title="No se pudo cargar el torneo" description={error ?? undefined} type="error" /></section>
  }

  const { torneo } = detalle
  const estaPublicado = torneo.estado === 'EN_CURSO' || torneo.estado === 'FINALIZADO'
  const enInscripcion = torneo.estado === 'INSCRIPCION'
  const esBorrador = torneo.estado === 'BORRADOR'
  const mostrarInfo = !esBorrador
  const mostrarVistaCompetitiva = !esBorrador && !enInscripcion
  const descripcionPartidos = enInscripcion
    ? 'Organizadas por categoría.'
    : torneo.formato === 'LIGA'
      ? 'Tabla de posiciones por categoría.'
      : torneo.incluyeFaseGrupos && torneo.incluyeEliminacion
        ? 'Fase de grupos y llaves por categoría.'
        : torneo.incluyeEliminacion
          ? 'Llaves por categoría.'
          : 'Fase de grupos por categoría.'
  const campeonesPorCategoria = datosVista.categorias.map((categoria) => {
    const partidoCampeon = obtenerPartidoCampeon(partidosPorCategoria(detalle.partidos)[categoria] ?? [])
    if (partidoCampeon) {
      return { categoria, campeon: partidoCampeon.ganadorNombre ?? null, subcampeon: obtenerNombreSubcampeon(partidoCampeon) }
    }
    const { campeon, subcampeon } = obtenerCampeonLiga(gruposPorCategoria(grupos)[categoria] ?? [])
    return { categoria, campeon, subcampeon }
  })

  return (
    <section className="tournament-detail-page">
      <div className="tournament-detail-inner">
        <Button variant="subtle" size="sm" asChild className="td-back-button">
          <NavLink to="/torneos">
            <ArrowLeft size={16} />
            Volver a torneos
          </NavLink>
        </Button>

        {enInscripcion ? (
          <div className="mt-4">
            <Button asChild>
              <NavLink to={`/torneos/${torneoId}/inscribirme`}>
                <NotebookPen size={16} />
                Inscribirme a este torneo
              </NavLink>
            </Button>
          </div>
        ) : null}

        {esBorrador ? (
          <div className="mt-4">
            <StatusMessage title="Torneo no publicado" description="Este torneo todavía no está disponible para consulta pública." />
          </div>
        ) : null}

        {mostrarInfo ? <div className="td-hero rp-surface">
          <div>
            <p className="td-eyebrow"><CircleDot size={14} />Detalle de torneo</p>
            <h1>{torneo.nombre}</h1>
            <div className="td-badges">
              <StatusBadge tone={torneo.estado === 'EN_CURSO' ? 'live' : torneo.estado === 'FINALIZADO' ? 'success' : 'neutral'}>
                {formatearEnum(torneo.estado)}
              </StatusBadge>
              <StatusBadge tone="neutral">{formatearEnum(torneo.formato)}</StatusBadge>
              {torneo.sumaPuntosRanking ? <StatusBadge tone="warning">Suma ranking</StatusBadge> : null}
            </div>
          </div>

          {torneo.descripcion && (
            <p className="mt-3 text-sm text-rp-muted leading-relaxed">{torneo.descripcion}</p>
          )}

          <dl className="td-info-grid">
            <ItemInfo icon={CalendarDays} label="Inicio" value={formatearFecha(torneo.fechaInicio)} />
            {torneo.fechaFin ? <ItemInfo icon={CalendarDays} label="Fin" value={formatearFecha(torneo.fechaFin)} /> : null}
            <ItemInfo icon={MapPin} label="Lugar" value={torneo.lugarNombre ?? 'Sin lugar'} />
            {torneo.premioAcumulado ? (
              <ItemInfo icon={Trophy} label="Premios" value={formatearMoneda(torneo.premioAcumulado)} />
            ) : null}
            <ItemInfo icon={Trophy} label="Partidos" value={String(detalle.partidos.length)} />
            {torneo.cupoMaximoParejas ? (
              <ItemInfo icon={Trophy} label="Cupo" value={`${detalle.parejas.length}/${torneo.cupoMaximoParejas} parejas`} />
            ) : null}
          </dl>

          <div className="td-categories">
            {torneo.categorias.map((categoria) => (
              <NavLink key={categoria.id} to={`/ranking?categoria=${categoria.id}`}>{categoria.nombre}</NavLink>
            ))}
          </div>
        </div> : null}

        {torneo.estado === 'FINALIZADO' ? (
          <section className="td-champions rp-surface">
            <h2 className="td-title-with-icon"><Trophy size={22} />Campeones por categoría</h2>
            <div className="td-champion-grid">
              {campeonesPorCategoria.map(({ categoria, campeon, subcampeon }) => (
                <article key={categoria} className="td-champion-card rp-card-hover">
                  <span>{categoria}</span>
                  <strong>{campeon ?? 'Sin campeón cargado'}</strong>
                  <small><Medal size={13} />Subcampeón: {subcampeon ?? 'Sin dato'}</small>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {estaPublicado && tramosProximos.length > 0 && (() => {
          const total = tramosProximos.length
          const indiceSeguro = Math.min(indiceProximos, total - 1)
          const tramo = tramosProximos[indiceSeguro]
          return (
            <section className="td-content rp-surface">
              <h2 className="td-title-with-icon"><CalendarDays size={22} />Próximos partidos</h2>
              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-rp-border bg-rp-surface/82 px-3 py-2">
                <button type="button" aria-label="Anterior" disabled={total <= 1} onClick={() => setIndiceProximos((indiceSeguro - 1 + total) % total)} className="flex size-8 shrink-0 items-center justify-center rounded-md text-rp-muted transition hover:text-rp-accent disabled:opacity-30">
                  <ChevronLeft size={18} />
                </button>
                <div className="min-w-0 text-center">
                  <p className="truncate text-sm font-black text-rp-text">{tramo.etiqueta}</p>
                  {total > 1 && <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-rp-muted">{indiceSeguro + 1} / {total}</p>}
                </div>
                <button type="button" aria-label="Siguiente" disabled={total <= 1} onClick={() => setIndiceProximos((indiceSeguro + 1) % total)} className="flex size-8 shrink-0 items-center justify-center rounded-md text-rp-muted transition hover:text-rp-accent disabled:opacity-30">
                  <ChevronRight size={18} />
                </button>
              </div>
              <div className="space-y-2 mt-3">
                {tramo.partidos.map((p) => (
                  <div key={p.id} className="td-partido-row">
                    <div className="td-partido-vs">
                      <NombreParejaApilado jugadores={[p.jugadorLocal1Nombre, p.jugadorLocal2Nombre]} jugadoresIds={[p.jugadorLocal1Id, p.jugadorLocal2Id]} className="td-partido-pair" />
                      <span className="td-partido-sep">vs</span>
                      <NombreParejaApilado jugadores={[p.jugadorVisitante1Nombre, p.jugadorVisitante2Nombre]} jugadoresIds={[p.jugadorVisitante1Id, p.jugadorVisitante2Id]} className="td-partido-pair" />
                    </div>
                    <div className="td-partido-meta">
                      <span className="td-partido-cat">{metaPartido(p).join(' · ')}</span>
                    </div>
                    <div className="td-partido-right">
                      {p.fechaHoraProgramada && (
                        <div className="td-partido-fecha">
                          {new Date(p.fechaHoraProgramada).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      {p.canchaNombre && <div className="td-partido-cancha">{p.canchaNombre}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        })()}

        {mostrarInfo ? (
          <section className="td-content rp-surface">
            <div className="td-section-head">
              <div>
                <h2 className="td-title-with-icon">
                  {enInscripcion ? <NotebookPen size={22} /> : <ClipboardList size={22} />}
                  {enInscripcion ? 'Parejas inscriptas' : 'Partidos y resultados'}
                </h2>
                <p>{descripcionPartidos}</p>
              </div>

              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                <label className="td-category-select">
                  <span>Categoría</span>
                  <select value={datosVista.categoria} onChange={(event) => setCategoriaSeleccionada(event.target.value)}>
                    {datosVista.categorias.map((categoria) => <option key={categoria} value={categoria}>{categoria}</option>)}
                  </select>
                </label>
                {estaPublicado && (
                  <Button variant="subtle" size="sm" asChild>
                    <NavLink to={`/torneos/${torneoId}/resultados`}><ListChecks size={15} />Ver todos los resultados</NavLink>
                  </Button>
                )}
              </div>
            </div>

            {enInscripcion ? (
              <ListaParejas parejas={datosVista.parejas} />
            ) : mostrarVistaCompetitiva ? (
              <FormatoTorneo grupos={datosVista.grupos} partidos={datosVista.partidos} parejas={datosVista.parejas} torneo={torneo} />
            ) : null}
          </section>
        ) : null}
      </div>
    </section>
  )
}

const ItemInfo = memo(function ItemInfo({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div>
      <dt><Icon size={15} />{label}</dt>
      <dd>{value}</dd>
    </div>
  )
})

function ListaParejas({ parejas }: { parejas: TorneoDetalleResponse['parejas'] }) {
  if (parejas.length === 0) return <StatusMessage title="No hay parejas inscriptas en esta categoría" />

  return (
    <div className="td-pairs-grid">
      {parejas.map((pareja) => (
        <article key={pareja.id} className="td-pair-card">
          <NombreParejaApilado jugadores={[pareja.jugador1Nombre, pareja.jugador2Nombre]} className="td-pair-names" />
          {pareja.estado !== 'ACTIVA' && (
            <StatusBadge tone={pareja.estado === 'CAMPEON' ? 'success' : 'neutral'}>{formatearEnum(pareja.estado)}</StatusBadge>
          )}
        </article>
      ))}
    </div>
  )
}

function FormatoTorneo({
  grupos,
  partidos,
  parejas,
  torneo,
}: {
  grupos: GrupoResponse[]
  partidos: PartidoResponse[]
  parejas: TorneoDetalleResponse['parejas']
  torneo: TorneoDetalleResponse['torneo']
}) {
  const esLiga = torneo.formato === 'LIGA'
  const partidosEliminacion = ordenarPartidosCuadro(partidos.filter((partido) => partido.fase === 'ELIMINACION'))
  const partidosGrupos = partidos.filter((partido) => partido.fase === 'GRUPOS')

  if (grupos.length === 0 && partidos.length === 0) {
    return <StatusMessage title="Todavía no hay partidos cargados para esta categoría" />
  }

  return (
    <div className="td-format-grid">
      <section>
        <h3 className="td-title-with-icon"><Table2 size={18} />{esLiga ? 'Tabla de posiciones' : 'Fase de grupos'}</h3>
        {grupos.length > 0 ? (
          <div className="td-groups">
            {grupos.map((grupo) => (
              <article key={grupo.id} className="td-group-card">
                <h4>{grupo.nombre}</h4>
                <div className="td-standings">
                  <div className="td-standings-head">
                    <span className="td-st-rank" />
                    <span className="td-st-name">Pareja</span>
                    <span className="td-st-cell">PJ</span>
                    <span className="td-st-cell">PG</span>
                    <span className="td-st-cell">PP</span>
                    <span className="td-st-cell">+/- Sets</span>
                    <span className="td-st-cell">Pts</span>
                  </div>
                  {grupo.posiciones.map((posicion, index) => {
                    const difSets = posicion.setsGanados - posicion.setsPerdidos
                    return (
                      <div key={posicion.id} className="td-standing-row">
                        <span className="td-st-rank">{index + 1}</span>
                        <span className="td-st-name">
                          {posicion.parejaNombre.split('/').map((jugador, jugadorIndex) => (
                            <span key={jugadorIndex} className="td-st-player">{jugador.trim()}</span>
                          ))}
                        </span>
                        <span className="td-st-cell" data-label="PJ">{posicion.pj}</span>
                        <span className="td-st-cell" data-label="PG">{posicion.pg}</span>
                        <span className="td-st-cell" data-label="PP">{posicion.pp}</span>
                        <span className="td-st-cell" data-label="Sets" style={{ color: difSets > 0 ? 'var(--rp-green-600)' : difSets < 0 ? '#c0392b' : 'inherit', fontWeight: 700 }}>{difSets > 0 ? '+' : ''}{difSets}</span>
                        <span className="td-st-cell td-st-pts" data-label="Pts">{posicion.puntos}</span>
                      </div>
                    )
                  })}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <ListaPartidos partidos={partidosGrupos} vacio="Sin fase de grupos cargada." />
        )}
        {esLiga && grupos.length > 0 && (
          <p className="td-muted" style={{ marginTop: 12 }}>
            Liga: el ganador es la pareja con más puntos al finalizar todos los partidos.
          </p>
        )}
      </section>

      {!esLiga && (
        <section>
          <h3 className="td-title-with-icon"><GitBranch size={18} />Llaves</h3>
          <Cuadro partidos={partidosEliminacion} parejas={parejas} torneo={torneo} />
        </section>
      )}
    </div>
  )
}

function ListaPartidos({ vacio, partidos }: { vacio: string; partidos: PartidoResponse[] }) {
  if (partidos.length === 0) return <p className="td-muted">{vacio}</p>
  return (
    <div className="td-match-list">
      {partidos.map((partido) => <TarjetaPartido key={partido.id} partido={partido} />)}
    </div>
  )
}

function Cuadro({ partidos, parejas, torneo }: { partidos: PartidoResponse[]; parejas: TorneoDetalleResponse['parejas']; torneo: TorneoDetalleResponse['torneo'] }) {
  if (partidos.length === 0) return <p className="td-muted">Sin llaves cargadas.</p>

  const rondas = construirRondasCuadro(partidos, parejas, torneo)

  return (
    <BracketCuadro
      rondas={rondas}
      renderSlot={(partido) => (partido ? <TarjetaPartido partido={partido} compacto /> : <TarjetaPartidoVacia />)}
    />
  )
}

function TarjetaPartidoVacia() {
  return (
    <article className="td-match-card compact is-empty">
      <div className="td-empty-slot">
        <div className="td-empty-pair">—</div>
        <div className="td-empty-vs">vs</div>
        <div className="td-empty-pair">—</div>
      </div>
    </article>
  )
}

function FilaParejaBracket({ partido, lado, sets }: { partido: PartidoResponse; lado: 'local' | 'visitante'; sets: SetMarcador[] }) {
  const datosJugadores: Array<[string, number | null]> = (lado === 'local'
    ? [[partido.jugadorLocal1Nombre, partido.jugadorLocal1Id], [partido.jugadorLocal2Nombre, partido.jugadorLocal2Id]]
    : [[partido.jugadorVisitante1Nombre, partido.jugadorVisitante1Id], [partido.jugadorVisitante2Nombre, partido.jugadorVisitante2Id]])
    .filter(([nombre]) => Boolean(nombre)) as Array<[string, number | null]>
  const parejaId = lado === 'local' ? partido.parejaLocalId : partido.parejaVisitanteId
  const esGanador = partido.ganadorId != null && partido.ganadorId === parejaId

  return (
    <div className={esGanador ? 'td-sb-row win' : 'td-sb-row'}>
      <div className="td-sb-nombres">
        {datosJugadores.map(([nombre, id], indice) => (
          id != null
            ? <NavLink key={indice} to={`/jugadores/${id}`} onClick={(evento) => evento.stopPropagation()}>{nombre}</NavLink>
            : <span key={indice}>{nombre}</span>
        ))}
      </div>
      <div className="td-sb-sets">
        {sets.length > 0
          ? sets.map((set, indice) => (
              <span key={indice} className={set.winner === lado ? 'td-sb-set ganado' : 'td-sb-set'}>
                {lado === 'local' ? set.local : set.visitante}
              </span>
            ))
          : partido.ganadorId != null
            ? <span className="td-sb-nota">{esGanador ? 'Pasa' : formatearEstadoPartido(partido.estado)}</span>
            : null}
      </div>
      {esGanador ? <Check size={13} className="td-sb-check" /> : <span className="td-sb-check-vacio" />}
    </div>
  )
}

function TarjetaPartido({ compacto = false, partido }: { compacto?: boolean; partido: PartidoResponse }) {
  const tieneHorario = Boolean(partido.fechaHora || partido.fechaHoraProgramada)
  const mostrarHorario = tieneHorario && (!compacto || !partido.marcador)
  const tono = partido.estado === 'EN_CURSO' ? 'live' : partido.estado === 'FINALIZADO' ? 'success' : 'neutral'
  const horario = mostrarHorario
    ? <small><ListChecks size={12} />{formatearFechaPartido(partido)}{partido.canchaNombre ? ` · ${partido.canchaNombre}` : ''}</small>
    : null

  if (compacto) {
    const sets = parsearMarcador(partido.marcador)
    return (
      <article className="td-match-card compact">
        <div className="td-match-top">
          <StatusBadge tone={tono}>{formatearEnum(partido.estado)}</StatusBadge>
        </div>
        <FilaParejaBracket partido={partido} lado="local" sets={sets} />
        <FilaParejaBracket partido={partido} lado="visitante" sets={sets} />
        {horario}
      </article>
    )
  }

  return (
    <article className="td-match-card">
      <div className="td-match-top">
        <StatusBadge tone={tono}>{formatearEnum(partido.estado)}</StatusBadge>
        <span>{partido.marcador ?? 'Sin resultado'}</span>
      </div>
      <p className={partido.ganadorId === partido.parejaLocalId ? 'winner' : ''}>{formatearPareja(partido, 'local')}</p>
      <p className={partido.ganadorId === partido.parejaVisitanteId ? 'winner' : ''}>{formatearPareja(partido, 'visitante')}</p>
      {horario}
    </article>
  )
}
