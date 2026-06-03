import './TournamentDetailPage.css'
import { ArrowLeft, CalendarDays, CircleDot, ClipboardList, GitBranch, ListChecks, MapPin, Medal, NotebookPen, Table2, Trophy } from 'lucide-react'
import { memo, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { NavLink, useParams } from 'react-router-dom'

import { tournamentsApi } from '@/features/tournaments/tournamentsApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { formatearFecha, formatearFechaHora, formatearEnum, formatearEtapaPartido, formatearPareja, formatearNombreRonda } from '@/shared/lib/formatters'
import { obtenerPartidoCampeon, obtenerNombreSubcampeon, gruposPorCategoria, partidosPorCategoria, parejasPorCategoria, ordenarPartidosCuadro } from '@/shared/lib/tournamentView'
import type { GrupoResponse, PartidoResponse, TorneoDetalleResponse } from '@/shared/types/api'
import { Button } from '@/shared/ui/Button'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { StatusMessage } from '@/shared/ui/StatusMessage'

export default function TournamentDetailPage() {
  const { torneoId } = useParams()
  const torneoIdNumerico = Number(torneoId)
  const torneoIdValido = Number.isFinite(torneoIdNumerico)
  const [detalle, setDetalle] = useState<TorneoDetalleResponse | null>(null)
  const [grupos, setGrupos] = useState<GrupoResponse[]>([])
  const [calendario, setCalendario] = useState<PartidoResponse[]>([])
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('')
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
        setCategoriaSeleccionada(datosDetalle.torneo.categorias[0]?.nombre ?? '')
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
    const categorias = detalle.torneo.categorias.map((categoria) => categoria.nombre)
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
  const mostrarVistaCompetitiva = !esBorrador && !enInscripcion
  const campeonesPorCategoria = datosVista.categorias.map((categoria) => {
    const partidoCampeon = obtenerPartidoCampeon(partidosPorCategoria(detalle.partidos)[categoria] ?? [])
    return { categoria, partidoCampeon, subcampeon: obtenerNombreSubcampeon(partidoCampeon) }
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

        {!estaPublicado ? (
          <div className="mt-4">
            <StatusMessage title="Torneo no publicado" description="Este torneo todavía no está disponible para consulta pública." />
          </div>
        ) : null}

        {estaPublicado ? <div className="td-hero rp-surface">
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
            <ItemInfo icon={Trophy} label="Partidos" value={String(detalle.partidos.length)} />
            {torneo.cupoMaximoParejas ? (
              <ItemInfo icon={Trophy} label="Cupo" value={`${detalle.parejas.length}/${torneo.cupoMaximoParejas} parejas`} />
            ) : null}
          </dl>

          <div className="td-categories">
            {torneo.categorias.map((categoria) => (
              <span key={categoria.id}>{categoria.nombre}</span>
            ))}
          </div>
        </div> : null}

        {estaPublicado && torneo.estado === 'FINALIZADO' ? (
          <section className="td-champions rp-surface">
            <h2 className="td-title-with-icon"><Trophy size={22} />Campeones por categoría</h2>
            <div className="td-champion-grid">
              {campeonesPorCategoria.map(({ categoria, partidoCampeon, subcampeon }) => (
                <article key={categoria} className="td-champion-card rp-card-hover">
                  <span>{categoria}</span>
                  <strong>{partidoCampeon?.ganadorNombre ?? 'Sin campeón cargado'}</strong>
                  <small><Medal size={13} />Subcampeón: {subcampeon ?? 'Sin dato'}</small>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {estaPublicado && calendario.length > 0 && (
          <section className="td-content rp-surface">
            <h2 className="td-title-with-icon"><CalendarDays size={22} />Próximos partidos</h2>
            <div className="space-y-2 mt-3">
              {calendario.slice(0, 10).map((p) => (
                <div key={p.id} className="td-partido-row">
                  <div className="td-partido-vs">
                    <span className="td-partido-pair">{p.jugadorLocal1Nombre} / {p.jugadorLocal2Nombre}</span>
                    <span className="td-partido-sep">vs</span>
                    <span className="td-partido-pair">{p.jugadorVisitante1Nombre} / {p.jugadorVisitante2Nombre}</span>
                  </div>
                  <div className="td-partido-meta">
                    <span className="td-partido-cat">{p.categoriaNombre} · {p.ronda ?? p.grupoNombre}</span>
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
        )}

        {estaPublicado && esBorrador ? (
          <StatusMessage title="Torneo en borrador" description="La información competitiva todavía no está publicada." />
        ) : estaPublicado ? (
          <section className="td-content rp-surface">
            <div className="td-section-head">
              <div>
                <h2 className="td-title-with-icon">
                  {enInscripcion ? <NotebookPen size={22} /> : <ClipboardList size={22} />}
                  {enInscripcion ? 'Parejas inscriptas' : 'Partidos y resultados'}
                </h2>
                <p>{enInscripcion ? 'Organizadas por categoría.' : 'Fase de grupos y llaves por categoría.'}</p>
              </div>

              <label className="td-category-select">
                <span>Categoría</span>
                <select value={datosVista.categoria} onChange={(event) => setCategoriaSeleccionada(event.target.value)}>
                  {datosVista.categorias.map((categoria) => <option key={categoria} value={categoria}>{categoria}</option>)}
                </select>
              </label>
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
          <strong>{pareja.jugador1Nombre} / {pareja.jugador2Nombre}</strong>
          <StatusBadge tone={pareja.estado === 'CAMPEON' ? 'success' : 'neutral'}>{formatearEnum(pareja.estado)}</StatusBadge>
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

const TAMANOS_RONDA = [16, 8, 4, 2] as const

const ETIQUETAS_RONDA: Record<number, string> = {
  16: 'Octavos de final',
  8: 'Cuartos de final',
  4: 'Semifinales',
  2: 'Final',
}

type RondaCuadro = {
  etiqueta: string
  partidos: Array<PartidoResponse | null>
  tamano: number
}

function obtenerTamanoRonda(ronda: string | null | undefined) {
  const formateado = formatearNombreRonda(ronda)
  const normalizado = (formateado ?? ronda ?? '').trim().toLowerCase()
  const tamanoExplicito = normalizado.match(/ronda\s+de\s+(\d+)/)?.[1]

  if (tamanoExplicito) return Number(tamanoExplicito)
  if (normalizado.includes('octavo')) return 16
  if (normalizado.includes('cuarto')) return 8
  if (normalizado.includes('semi')) return 4
  if (normalizado.includes('final')) return 2
  return null
}

function obtenerTamanoInicial(partidos: PartidoResponse[], parejas: TorneoDetalleResponse['parejas'], torneo: TorneoDetalleResponse['torneo']) {
  const mayorTamanoNombrado = Math.max(0, ...partidos.map((partido) => obtenerTamanoRonda(partido.ronda)).filter(Boolean) as number[])
  const mayorRondaReal = Math.max(0, ...Object.values(
    partidos.reduce<Record<string, number>>((acumulador, partido) => {
      const clave = String(partido.rondaOrden ?? obtenerTamanoRonda(partido.ronda) ?? formatearEtapaPartido(partido))
      acumulador[clave] = (acumulador[clave] ?? 0) + 1
      return acumulador
    }, {}),
  ).map((cantidad) => cantidad * 2))
  const clasificadosGrupos =
    torneo.incluyeFaseGrupos && torneo.cantidadGrupos && torneo.avanzanPorGrupo
      ? torneo.cantidadGrupos * torneo.avanzanPorGrupo
      : 0
  const participantesConfig = clasificadosGrupos || parejas.length || torneo.cantidadParejasObjetivo || 0
  const tamanoCuadroExplicito = Math.max(mayorTamanoNombrado, mayorRondaReal)
  const tamanoInferido = tamanoCuadroExplicito || participantesConfig || 2

  return [...TAMANOS_RONDA].reverse().find((tamano) => tamano >= tamanoInferido) ?? 16
}

function construirRondasCuadro(partidos: PartidoResponse[], parejas: TorneoDetalleResponse['parejas'], torneo: TorneoDetalleResponse['torneo']): RondaCuadro[] {
  const tamanoInicial = obtenerTamanoInicial(partidos, parejas, torneo)
  const tamanosPosibles = TAMANOS_RONDA.filter((tamano) => tamano <= tamanoInicial)
  const clavesRondaOrdenadas = [...new Set(partidos.map((partido) => partido.rondaOrden ?? obtenerTamanoRonda(partido.ronda) ?? 0))]
    .sort((a, b) => Number(a) - Number(b))
  const ordenATamano = new Map(clavesRondaOrdenadas.map((orden, index) => [orden, tamanosPosibles[index] ?? tamanosPosibles.at(-1) ?? 2]))
  const partidosPorTamano = new Map<number, PartidoResponse[]>()

  partidos.forEach((partido) => {
    const tamano = obtenerTamanoRonda(partido.ronda) ?? ordenATamano.get(partido.rondaOrden ?? 0) ?? 2
    partidosPorTamano.set(tamano, [...(partidosPorTamano.get(tamano) ?? []), partido])
  })

  // Siempre mostrar todas las rondas del cuadro (las vacías muestran placeholder)
  return tamanosPosibles.map((tamano) => {
    const partidosRonda = [...(partidosPorTamano.get(tamano) ?? [])].sort((a, b) => a.id - b.id)
    const cantidadEsperada = tamano / 2
    return {
      etiqueta: ETIQUETAS_RONDA[tamano] ?? `Ronda de ${tamano}`,
      partidos: Array.from({ length: cantidadEsperada }, (_, index) => partidosRonda[index] ?? null),
      tamano,
    }
  })
}

// Altura base del slot de la primera ronda (px). Cada ronda siguiente dobla este valor.
const UNIDAD_CUADRO = 104
// Longitud de cada brazo del conector (mitad del gap de 48px entre columnas)
const CONECTOR_CUADRO = 24

function Cuadro({ partidos, parejas, torneo }: { partidos: PartidoResponse[]; parejas: TorneoDetalleResponse['parejas']; torneo: TorneoDetalleResponse['torneo'] }) {
  if (partidos.length === 0) return <p className="td-muted">Sin llaves cargadas.</p>

  const rondas = construirRondasCuadro(partidos, parejas, torneo)

  return (
    <div className="td-bracket-v2">
      {rondas.map((ronda, indiceRonda) => {
        // Cada ronda dobla la altura: ronda 0 = UNIT, ronda 1 = 2×UNIT, ronda 2 = 4×UNIT...
        const altoSlot = UNIDAD_CUADRO * Math.pow(2, indiceRonda)
        // El brazo del conector es exactamente la mitad de la altura del slot
        const brazo = altoSlot / 2
        const tieneSaliente = indiceRonda < rondas.length - 1
        const tieneEntrante = indiceRonda > 0

        return (
          <div key={ronda.tamano} className="td-bcol">
            <div className="td-bcol-label">{ronda.etiqueta}</div>
            <div className="td-bcol-slots">
              {ronda.partidos.map((partido, indicePartido) => {
                const esPar = indicePartido % 2 === 0
                return (
                  <div
                    key={partido?.id ?? `${ronda.tamano}-${indicePartido}`}
                    className={`td-bslot${partido ? '' : ' is-empty'}`}
                    style={{ height: altoSlot }}
                  >
                    {/* Línea entrante desde el nodo de la ronda anterior (centro del gap hacia esta card) */}
                    {tieneEntrante && (
                      <span className="td-bconn-in" style={{ width: CONECTOR_CUADRO } as CSSProperties} />
                    )}
                    {partido ? <TarjetaPartido partido={partido} compacto /> : <TarjetaPartidoVacia />}
                    {/* Conectores salientes: brazo horizontal hasta el centro del gap + ramal vertical hasta el nodo */}
                    {tieneSaliente && (
                      <span
                        className={`td-bconn ${esPar ? 'bconn-top' : 'bconn-bot'}`}
                        style={{ height: brazo, width: CONECTOR_CUADRO } as CSSProperties}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
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

function TarjetaPartido({ compacto = false, partido }: { compacto?: boolean; partido: PartidoResponse }) {
  return (
    <article className={compacto ? 'td-match-card compact' : 'td-match-card'}>
      <div className="td-match-top">
        <StatusBadge tone={partido.estado === 'EN_CURSO' ? 'live' : partido.estado === 'FINALIZADO' ? 'success' : 'neutral'}>{formatearEnum(partido.estado)}</StatusBadge>
        <span>{partido.marcador ?? 'Sin resultado'}</span>
      </div>
      <p className={partido.ganadorId === partido.parejaLocalId ? 'winner' : ''}>{formatearPareja(partido, 'local')}</p>
      <p className={partido.ganadorId === partido.parejaVisitanteId ? 'winner' : ''}>{formatearPareja(partido, 'visitante')}</p>
      {!compacto && partido.fechaHora ? <small><ListChecks size={12} />{formatearFechaHora(partido.fechaHora)}</small> : null}
    </article>
  )
}
