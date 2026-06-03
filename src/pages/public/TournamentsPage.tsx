import { CalendarDays, Filter, MapPin, Search, Trophy, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'

import { brand } from '@/config/brand'
import { tournamentsApi } from '@/features/tournaments/tournamentsApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { formatearFecha, formatearEnum } from '@/shared/lib/formatters'
import type { CategoriaResponse, EstadoTorneo, Genero, TorneoResponse } from '@/shared/types/api'
import { Pagination } from '@/shared/ui/Pagination'
import { StatusMessage } from '@/shared/ui/StatusMessage'
import './TournamentsPage.css'

const estadosPublicos: EstadoTorneo[] = ['EN_CURSO', 'FINALIZADO']
const opcionesEstado: EstadoTorneo[] = estadosPublicos
const opcionesGenero: Genero[] = ['MASCULINO', 'FEMENINO']
const TAMANO_PAGINA = 9

const TarjetaTorneo = memo(function TarjetaTorneo({ torneo }: { torneo: TorneoResponse }) {
  return (
    <NavLink to={`/torneos/${torneo.id}`} className="tournament-card">
      <div className="tc-head">
        <span className={`tc-status ${torneo.estado === 'EN_CURSO' ? 'live' : ''}`}>
          {formatearEnum(torneo.estado)}
        </span>
        <span className="tc-format">{formatearEnum(torneo.formato)}</span>
      </div>
      <h2>{torneo.nombre}</h2>
      <div className="tc-meta">
        <span>
          <span className="tc-icon"><MapPin size={16} /></span>
          {torneo.lugarNombre ?? 'Sede a confirmar'}
        </span>
        <span>
          <span className="tc-icon"><CalendarDays size={16} /></span>
          {formatearFecha(torneo.fechaInicio)}
        </span>
        <span>
          <span className="tc-icon"><Users size={16} /></span>
          {torneo.cantidadParejas} parejas
        </span>
      </div>
      <div className="tc-categories">
        {torneo.categorias.length > 0 ? (
          torneo.categorias.map((categoria) => (
            <span key={categoria.id} className="tc-category">{categoria.nombre}</span>
          ))
        ) : (
          <span className="tc-empty-category">Sin categorías cargadas</span>
        )}
      </div>
    </NavLink>
  )
})

export default function TournamentsPage() {
  const [torneos, setTorneos] = useState<TorneoResponse[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState<EstadoTorneo | ''>('')
  const [genero, setGenero] = useState<Genero | ''>('')
  const [categoriaId, setCategoriaId] = useState('')
  const [pagina, setPagina] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controlador = new AbortController()
    let montado = true

    tournamentsApi.getAll()
      .then((datosTorneos) => {
        if (!montado || controlador.signal.aborted) return
        setTorneos(datosTorneos)
        setError(null)
      })
      .catch((errorCapturado: unknown) => {
        if (!montado || controlador.signal.aborted) return
        setError(obtenerMensajeErrorApi(errorCapturado))
      })
      .finally(() => {
        if (!montado || controlador.signal.aborted) return
        setCargando(false)
      })

    return () => {
      montado = false
      controlador.abort()
    }
  }, [])

  const manejarCambioBusqueda = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setBusqueda(event.target.value)
    setPagina(1)
  }, [])

  const manejarCambioEstado = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setEstado(event.target.value as EstadoTorneo | '')
    setPagina(1)
  }, [])

  const manejarCambioGenero = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setGenero(event.target.value as Genero | '')
    setPagina(1)
  }, [])

  const manejarCambioCategoria = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setCategoriaId(event.target.value)
    setPagina(1)
  }, [])

  const torneosFiltrados = useMemo(() => {
    const busquedaNormalizada = busqueda.trim().toLowerCase()
    const categoriaSeleccionadaId = categoriaId ? Number(categoriaId) : null

    return torneos.filter((torneo) => {
      const coincideEstadoPublico = estadosPublicos.includes(torneo.estado)
      const coincideBusqueda =
        !busquedaNormalizada ||
        torneo.nombre.toLowerCase().startsWith(busquedaNormalizada) ||
        (torneo.lugarNombre ?? '').toLowerCase().startsWith(busquedaNormalizada)

      const coincideEstado = !estado || torneo.estado === estado
      const coincideGenero = !genero || torneo.categorias.some((categoria) => categoria.genero === genero)
      const coincideCategoria =
        categoriaSeleccionadaId === null || torneo.categorias.some((categoria) => categoria.id === categoriaSeleccionadaId)

      return coincideEstadoPublico && coincideBusqueda && coincideEstado && coincideGenero && coincideCategoria
    }).sort((a, b) => b.id - a.id)
  }, [categoriaId, genero, busqueda, estado, torneos])

  const torneosPublicos = useMemo(
    () => torneos.filter((torneo) => estadosPublicos.includes(torneo.estado)),
    [torneos],
  )

  const categoriasPublicas = useMemo(() => {
    const porId = new Map<number, CategoriaResponse>()
    torneosPublicos.forEach((torneo) => {
      torneo.categorias.forEach((categoria) => porId.set(categoria.id, categoria))
    })
    return Array.from(porId.values())
  }, [torneosPublicos])

  const torneosPaginados = useMemo(() => {
    const inicio = (pagina - 1) * TAMANO_PAGINA
    return torneosFiltrados.slice(inicio, inicio + TAMANO_PAGINA)
  }, [torneosFiltrados, pagina])

  const seccion = (contenido: ReactNode) => (
    <section className="tournaments-section">
      <div className="tournaments-inner">{contenido}</div>
    </section>
  )

  if (cargando) {
    return seccion(<StatusMessage title="Cargando torneos desde la API" type="loading" />)
  }

  if (error) {
    return seccion(
      <StatusMessage title="No se pudieron cargar los torneos" description={error} type="error" />,
    )
  }

  return seccion(
    <>
      <div className="tournaments-hero">
        <div>
          <div className="tournaments-eyebrow">
            <Trophy size={13} />
            CIRCUITO {brand.name.toUpperCase()}
          </div>

          <h1>Torneos</h1>

          <p>
            Calendario competitivo, categorías y resultados publicados del circuito provincial.
          </p>
        </div>

        <div className="tournaments-summary">
          <div>
            <strong>{torneosPublicos.length}</strong>
            <span>Torneos publicados</span>
          </div>

          <div>
            <strong>{categoriasPublicas.length}</strong>
            <span>Categorías</span>
          </div>
        </div>
      </div>

      <div className="tournaments-shell">
        <div className="toolbar">
          <div className="toolbar-head">
            <div>
              <span>Filtros</span>
              <strong>{torneosFiltrados.length} visibles</strong>
            </div>

            <Filter size={17} />
          </div>

          <div className="filters-grid">
            <label className="filter-field search-field">
              <Search size={16} />

            <input
              onChange={manejarCambioBusqueda}
              placeholder="Buscar torneo..."
              value={busqueda}
            />
            </label>

            <select
              className="filter-field"
              onChange={manejarCambioEstado}
              value={estado}
            >
              <option value="">Estado</option>
              {opcionesEstado.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {formatearEnum(opcion)}
                </option>
              ))}
            </select>

            <select
              className="filter-field"
              onChange={manejarCambioGenero}
              value={genero}
            >
              <option value="">Género</option>
              {opcionesGenero.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {formatearEnum(opcion)}
                </option>
              ))}
            </select>

            <select
              className="filter-field"
              onChange={manejarCambioCategoria}
              value={categoriaId}
            >
              <option value="">Categoría</option>
              {categoriasPublicas.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {torneosFiltrados.length > 0 ? (
          <div className="cards-grid">
            {torneosPaginados.map((torneo) => (
              <TarjetaTorneo key={torneo.id} torneo={torneo} />
            ))}
          </div>
        ) : (
          <div className="tournaments-empty">
            <StatusMessage title="No hay torneos para esos filtros" description="Cambiá la búsqueda o limpiá filtros." />
          </div>
        )}

        <Pagination page={pagina} pageSize={TAMANO_PAGINA} total={torneosFiltrados.length} onPageChange={setPagina} />
      </div>
    </>,
  )
}
