import './RankingPage.css'
import { Search, Trophy, Users } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { brand } from '@/config/brand'
import { categoriesApi, seasonsApi } from '@/features/catalog/catalogApi'
import { homeApi } from '@/features/home/homeApi'
import { rankingApi } from '@/features/ranking/rankingApi'
import { elementosTickerInicio } from '@/shared/lib/ticker'
import { resolveApiAssetUrl } from '@/shared/api/apiClient'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import type { CategoriaResponse, HomeResponse, RankingResponse } from '@/shared/types/api'
import { Pagination } from '@/shared/ui/Pagination'
import { SegmentedToggle } from '@/shared/ui/SegmentedToggle'
import { StatusMessage } from '@/shared/ui/StatusMessage'
import { TickerBar } from '@/pages/public/components/TickerBar'

const TAMANO_PAGINA = 10

function obtenerIniciales(nombre: string) {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()
}

function AvatarJugador({ entrada }: { entrada: RankingResponse }) {
  const fotoUrl = resolveApiAssetUrl(entrada.jugadorFotoUrl)
  const [fallo, setFallo] = useState(false)
  const iniciales = obtenerIniciales(entrada.jugadorNombre)

  return (
    <div className="player-avatar" aria-label={entrada.jugadorNombre}>
      {fotoUrl && !fallo ? <img src={fotoUrl} alt={entrada.jugadorNombre} onError={() => setFallo(true)} /> : <span>{iniciales}</span>}
    </div>
  )
}

export default function RankingPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const categoriaParam = searchParams.get('categoria') ?? ''
  const generoParam = searchParams.get('genero') === 'FEMENINO' ? 'FEMENINO' : 'MASCULINO'
  const [ranking, setRanking] = useState<RankingResponse[]>([])
  const [rankingGeneral, setRankingGeneral] = useState<RankingResponse[]>([])
  const [categorias, setCategorias] = useState<CategoriaResponse[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [genero, setGenero] = useState<'MASCULINO' | 'FEMENINO'>(generoParam)
  const [categoriaId, setCategoriaId] = useState(categoriaParam)
  const categoriaPorGenero = useRef<Record<string, string>>({})
  const [pagina, setPagina] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [temporadaActiva, setTemporadaActiva] = useState<string | null>(null)
  const [datosInicio, setDatosInicio] = useState<HomeResponse | null>(null)

  useEffect(() => {
    let montado = true
    homeApi.getHome()
      .then((datos) => { if (montado) setDatosInicio(datos) })
      .catch(() => { if (montado) setDatosInicio(null) })
    return () => { montado = false }
  }, [])

  useEffect(() => {
    let montado = true
    seasonsApi.getAll()
      .then((temporadas) => { if (montado) setTemporadaActiva(temporadas.find((t) => t.activa)?.nombre ?? null) })
      .catch(() => { if (montado) setTemporadaActiva(null) })
    return () => { montado = false }
  }, [])

  useEffect(() => {
    let montado = true

    categoriesApi.getAll()
      .then((listaCategorias) => {
        if (!montado) return
        setCategorias(listaCategorias)
        const categoriaUrl = categoriaParam ? listaCategorias.find((c) => c.id.toString() === categoriaParam) : undefined
        if (categoriaUrl) setGenero(categoriaUrl.genero)
        const ordenadas = [...listaCategorias].sort((a, b) => a.nivel - b.nivel || a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
        const categoriaPorDefecto = ordenadas.find((c) => c.genero === 'MASCULINO') ?? ordenadas[0]
        setCategoriaId((actual) => actual || categoriaPorDefecto?.id.toString() || '')
      })
      .catch((errorCapturado: unknown) => {
        if (!montado) return
        setError(obtenerMensajeErrorApi(errorCapturado))
        setCargando(false)
      })

    return () => {
      montado = false
    }
  }, [])

  useEffect(() => {
    let montado = true

    rankingApi.getRanking()
      .then((datosRanking) => {
        if (!montado) return
        setRankingGeneral(datosRanking)
      })
      .catch((errorCapturado: unknown) => {
        if (!montado) return
        setError(obtenerMensajeErrorApi(errorCapturado))
      })

    return () => {
      montado = false
    }
  }, [])

  useEffect(() => {
    let montado = true

    if (!categoriaId) {
      setRanking([])
      setCargando(false)
      return
    }

    setCargando(true)
    rankingApi.getRanking({ categoriaId: Number(categoriaId) })
      .then((datosRanking) => {
        if (!montado) return
        setRanking(datosRanking)
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
  }, [categoriaId])

  useEffect(() => {
    if (categoriaId) categoriaPorGenero.current[genero] = categoriaId
  }, [categoriaId, genero])

  useEffect(() => {
    setSearchParams((previo) => {
      const siguiente = new URLSearchParams(previo)
      siguiente.set('genero', genero)
      if (categoriaId) siguiente.set('categoria', categoriaId)
      else siguiente.delete('categoria')
      return siguiente
    }, { replace: true })
  }, [genero, categoriaId, setSearchParams])

  const rankingFiltrado = useMemo(() => {
    const busquedaNormalizada = busqueda.trim().toLowerCase()
    if (!busquedaNormalizada) return ranking
    return ranking.filter((entrada) => entrada.jugadorNombre.toLowerCase().includes(busquedaNormalizada))
  }, [ranking, busqueda])

  const metricas = useMemo(() => {
    const totalJugadores = new Set(rankingGeneral.map((entrada) => entrada.jugadorId)).size
    const totalPartidos = rankingGeneral.reduce((acumulado, entrada) => acumulado + entrada.victorias + entrada.derrotas, 0)
    const categoriasUnicas = new Set(rankingGeneral.map((entrada) => entrada.categoriaNombre)).size
    const mayorGanador = rankingGeneral.reduce<RankingResponse | null>((mejor, entrada) => (!mejor || entrada.victorias > mejor.victorias ? entrada : mejor), null)

    return { totalJugadores, totalPartidos, categoriasUnicas, mayorGanador }
  }, [rankingGeneral])

  const rankingPaginado = useMemo(() => {
    const inicio = (pagina - 1) * TAMANO_PAGINA
    return rankingFiltrado.slice(inicio, inicio + TAMANO_PAGINA)
  }, [rankingFiltrado, pagina])

  // Solo mostramos el placeholder completo en la primera carga (sin datos aún).
  // En los cambios de categoría posteriores mantenemos las filas y solo las atenuamos.
  const cargaInicial = cargando && ranking.length === 0

  const categoriasDelGenero = useMemo(
    () => categorias
      .filter((c) => c.genero === genero)
      .sort((a, b) => a.nivel - b.nivel || a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })),
    [categorias, genero]
  )

  function cambiarGenero(nuevoGenero: 'MASCULINO' | 'FEMENINO') {
    setGenero(nuevoGenero)
    setPagina(1)
    const recordada = categoriaPorGenero.current[nuevoGenero]
    if (recordada && categorias.some((c) => c.id.toString() === recordada && c.genero === nuevoGenero)) {
      setCategoriaId(recordada)
      return
    }
    const primera = categorias
      .filter((c) => c.genero === nuevoGenero)
      .sort((a, b) => a.nivel - b.nivel || a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))[0]
    setCategoriaId(primera ? primera.id.toString() : '')
  }

  const estadisticasCategoria = useMemo(() => {
    const categoriaSeleccionada = categoriasDelGenero.find((categoria) => categoria.id === Number(categoriaId))
    const mayorGanador = ranking.reduce<RankingResponse | null>((mejor, entrada) => (!mejor || entrada.victorias > mejor.victorias ? entrada : mejor), null)
    const mejorRacha = ranking.reduce<RankingResponse | null>((mejor, entrada) => (!mejor || entrada.victorias - entrada.derrotas > mejor.victorias - mejor.derrotas ? entrada : mejor), null)

    return { categoriaSeleccionada, mayorGanador, mejorRacha }
  }, [categoriaId, ranking, categoriasDelGenero])

  const elementosTicker = useMemo(() => elementosTickerInicio(datosInicio), [datosInicio])

  return (
    <>
      <header className="rank-hero">
        <div className="hero-inner">
          <div className="eyebrow">
            <Trophy size={13} />
            {temporadaActiva ? temporadaActiva.toUpperCase() : 'SIN TEMPORADA ACTIVA'}
          </div>
          <h1 className="rank-title">Ranking oficial <span>{brand.name}</span></h1>
          <p className="rank-lead">
            {temporadaActiva
              ? `Posiciones de la temporada ${temporadaActiva}, por categoría, rendimiento y participación en torneos del circuito.`
              : 'El ranking se muestra por temporada. Cuando se active una temporada vas a ver las posiciones acá.'}
          </p>

          <div className="hero-metrics">
            <div className="metric"><b>{metricas.totalJugadores}</b><span>Jugadores activos</span></div>
            <div className="metric"><b>{metricas.categoriasUnicas || categorias.length}</b><span>Categorías</span></div>
            <div className="metric"><b>{metricas.mayorGanador?.victorias ?? '-'}</b><span>Mayor cantidad de victorias</span></div>
            <div className="metric"><b>{metricas.totalPartidos || '-'}</b><span>Partidos registrados</span></div>
          </div>
        </div>
      </header>

      <TickerBar items={elementosTicker} label="RANKING" />

      <section className="ranking-section">
        <div className="ranking-inner">
          <div className="section-head">
            <div>
              <h2 className="section-title">Tabla de posiciones</h2>
              <div className="section-sub">CIRCUITO PROVINCIAL</div>
            </div>
          </div>

          <div className="rank-shell">
            <div className="rank-toolbar">
              <div className="rank-category-filter">
                <span>Género</span>
                <SegmentedToggle
                  opciones={[{ valor: 'MASCULINO', label: 'Masculino' }, { valor: 'FEMENINO', label: 'Femenino' }]}
                  valor={genero}
                  onChange={cambiarGenero}
                />
              </div>

              <label className="rank-category-filter">
                <span>Categoría</span>
                <select
                  value={categoriaId}
                  onChange={(event) => {
                    setCategoriaId(event.target.value)
                    setPagina(1)
                  }}
                >
                  {categoriasDelGenero.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </label>

              <label className="rank-search">
                <Search size={16} />
                <input onChange={(event) => { setBusqueda(event.target.value); setPagina(1) }} placeholder="Buscar jugador" value={busqueda} />
              </label>
            </div>

            <div
              className="rank-table-desktop"
              style={{ transition: 'opacity .15s ease', opacity: cargando && !cargaInicial ? 0.45 : 1, pointerEvents: cargando ? 'none' : undefined }}
            >
              <table className="ranking-table">
                <thead>
                  <tr>
                    {['#', 'Jugador', 'Categoría', 'Puntos', 'Torneos', 'Victorias', 'Derrotas', 'Mov.'].map((encabezado) => (
                      <th key={encabezado}>{encabezado}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cargaInicial ? (
                    <tr><td colSpan={8}><StatusMessage title="Cargando ranking..." type="loading" /></td></tr>
                  ) : error ? (
                    <tr><td colSpan={8}><StatusMessage title="Error" description={error} type="error" /></td></tr>
                  ) : rankingFiltrado.length > 0 ? (
                    rankingPaginado.map((entrada) => (
                      <tr key={`${entrada.categoriaId}-${entrada.jugadorId}`} style={{ cursor: 'pointer' }} onClick={() => navigate(`/jugadores/${entrada.jugadorId}`)}>
                        <td><span className="rank-position">{entrada.posicion}</span></td>
                        <td>
                          <div className="player-cell">
                            <AvatarJugador entrada={entrada} />
                            <div>
                              <Link to={`/jugadores/${entrada.jugadorId}`} className="player-name hover:text-rp-accent" onClick={(event) => event.stopPropagation()}>{entrada.jugadorNombre}</Link>
                              <div className="player-sub"><Users size={13} />Circuito {brand.name}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="category-pill">{entrada.categoriaNombre}</span></td>
                        <td><strong className="points">{entrada.puntosTotales}</strong></td>
                        <td>{entrada.torneosJugados}</td>
                        <td className="wins">{entrada.victorias}</td>
                        <td className="losses">{entrada.derrotas}</td>
                        <td className="balance">{entrada.tendencia}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="ranking-empty">
                        <strong>No hay jugadores en el ranking para esos filtros</strong>
                        <span>El ranking se alimenta cuando se cargan resultados.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div
              className="rank-cards-mobile"
              style={{ transition: 'opacity .15s ease', opacity: cargando && !cargaInicial ? 0.45 : 1, pointerEvents: cargando ? 'none' : undefined }}
            >
              {cargaInicial ? <StatusMessage title="Cargando..." type="loading" /> : null}
              {!cargaInicial && rankingPaginado.map((entrada) => (
                <article
                  key={`${entrada.categoriaId}-${entrada.jugadorId}`}
                  className="rank-card rp-card-hover"
                  role="link"
                  tabIndex={0}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/jugadores/${entrada.jugadorId}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      navigate(`/jugadores/${entrada.jugadorId}`)
                    }
                  }}
                >
                  <div className="rank-card-head">
                    <span className="rank-position">{entrada.posicion}</span>
                    <AvatarJugador entrada={entrada} />
                    <div className="rank-card-player">
                      <strong>{entrada.jugadorNombre}</strong>
                      <span>{entrada.categoriaNombre}</span>
                    </div>
                    <div className="rank-card-points">
                      <b>{entrada.puntosTotales}</b>
                      <span>PTS</span>
                    </div>
                  </div>

                  <div className="rank-card-stats">
                    {[
                      { label: 'Torneos', value: entrada.torneosJugados },
                      { label: 'Victorias', value: entrada.victorias },
                      { label: 'Derrotas', value: entrada.derrotas },
                      { label: 'Mov.', value: entrada.tendencia },
                    ].map((dato) => (
                      <div key={dato.label}>
                        <b>{dato.value}</b>
                        <span>{dato.label}</span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <Pagination page={pagina} pageSize={TAMANO_PAGINA} total={rankingFiltrado.length} onPageChange={setPagina} />
          </div>

          <div className="category-grid">
            <div className="category-card">
              <h3>Categoría seleccionada</h3>
              <p>Datos filtrados por la categoría que estás viendo.</p>
              <b>{estadisticasCategoria.categoriaSeleccionada ? `${estadisticasCategoria.categoriaSeleccionada.nombre} (${ranking.length})` : '-'}</b>
            </div>
            <div className="category-card">
              <h3>Mayor racha vigente</h3>
              <p>Mejor marca disponible a partir de victorias cargadas.</p>
              <b>{estadisticasCategoria.mejorRacha ? `${estadisticasCategoria.mejorRacha.jugadorNombre} (${estadisticasCategoria.mejorRacha.victorias - estadisticasCategoria.mejorRacha.derrotas})` : '-'}</b>
            </div>
            <div className="category-card">
              <h3>Más victorias</h3>
              <p>El mejor total de victorias acumuladas del ranking.</p>
              <b>{estadisticasCategoria.mayorGanador ? `${estadisticasCategoria.mayorGanador.jugadorNombre} (${estadisticasCategoria.mayorGanador.victorias})` : '-'}</b>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
