import './RankingPage.css'
import { Search, Trophy, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { brand } from '@/config/brand'
import { categoriesApi } from '@/features/catalog/catalogApi'
import { rankingApi } from '@/features/ranking/rankingApi'
import { resolveApiAssetUrl } from '@/shared/api/apiClient'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import type { CategoriaResponse, RankingResponse } from '@/shared/types/api'
import { Pagination } from '@/shared/ui/Pagination'
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
  const [ranking, setRanking] = useState<RankingResponse[]>([])
  const [rankingGeneral, setRankingGeneral] = useState<RankingResponse[]>([])
  const [categorias, setCategorias] = useState<CategoriaResponse[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [pagina, setPagina] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let montado = true

    categoriesApi.getAll()
      .then((listaCategorias) => {
        if (!montado) return
        setCategorias(listaCategorias)
        const ordenadas = [...listaCategorias].sort((a, b) => a.nivel - b.nivel || a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
        const categoriaPorDefecto =
          ordenadas.find((c) => c.genero === 'MASCULINO') ?? ordenadas[0]
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

  const categoriasOrdenadas = useMemo(() => [...categorias].sort((a, b) => {
    if (a.genero !== b.genero) return a.genero === 'MASCULINO' ? -1 : 1
    return a.nivel - b.nivel || a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
  }), [categorias])

  const estadisticasCategoria = useMemo(() => {
    const categoriaSeleccionada = categoriasOrdenadas.find((categoria) => categoria.id === Number(categoriaId))
    const mayorGanador = ranking.reduce<RankingResponse | null>((mejor, entrada) => (!mejor || entrada.victorias > mejor.victorias ? entrada : mejor), null)
    const mejorRacha = ranking.reduce<RankingResponse | null>((mejor, entrada) => (!mejor || entrada.victorias - entrada.derrotas > mejor.victorias - mejor.derrotas ? entrada : mejor), null)

    return { categoriaSeleccionada, mayorGanador, mejorRacha }
  }, [categoriaId, ranking, categoriasOrdenadas])

  const elementosTicker = useMemo(() => [
    { label: 'Temporada 2026', text: 'ranking por categoría' },
    { label: 'Mejor nivel', text: '1ra categoría primero' },
    { label: 'Líderes', text: 'competencia abierta' },
    { label: 'Top 10', text: 'paginado por categoría' },
  ], [])

  return (
    <>
      <header className="rank-hero">
        <div className="hero-inner">
          <div className="eyebrow">
            <Trophy size={13} />
            TEMPORADA 2026
          </div>
          <h1 className="rank-title">Ranking oficial <span>{brand.name}</span></h1>
          <p className="rank-lead">
            Posiciones actualizadas por categoría, rendimiento y participación en torneos del circuito provincial.
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
              <label className="rank-category-filter">
                <span>Categoría</span>
                <select
                  value={categoriaId}
                  onChange={(event) => {
                    setCategoriaId(event.target.value)
                    setPagina(1)
                  }}
                >
                  {categoriasOrdenadas.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </label>

              <label className="rank-search">
                <Search size={16} />
                <input onChange={(event) => { setBusqueda(event.target.value); setPagina(1) }} placeholder="Buscar jugador" value={busqueda} />
              </label>
            </div>

            <div className="rank-table-desktop">
              <table className="ranking-table">
                <thead>
                  <tr>
                    {['#', 'Jugador', 'Categoría', 'Puntos', 'Torneos', 'Victorias', 'Derrotas', 'Mov.'].map((encabezado) => (
                      <th key={encabezado}>{encabezado}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cargando ? (
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

            <div className="rank-cards-mobile">
              {cargando ? <StatusMessage title="Cargando..." type="loading" /> : null}
              {!cargando && rankingPaginado.map((entrada) => (
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
