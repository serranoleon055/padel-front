import './HomePage.css'
import { ArrowRight, CalendarDays, Check, Grid2X2, MapPin, Medal, NotebookPen, Radio, Trophy, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'

import { brand } from '@/config/brand'
import { homeApi } from '@/features/home/homeApi'
import { resolveApiAssetUrl } from '@/shared/api/apiClient'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { ordenarCategorias } from '@/shared/lib/categorias'
import { fechaCompacta, formatearFecha, formatearEnum, formatearEtapaPartido, formatearPareja } from '@/shared/lib/formatters'
import { obtenerLadoGanador, parsearMarcador } from '@/shared/lib/score'
import type { HomeResponse, TorneoResponse } from '@/shared/types/api'
import { StatusMessage } from '@/shared/ui/StatusMessage'
import { ResultMatchCard } from '@/pages/public/components/ResultMatchCard'
import { TickerBar } from '@/pages/public/components/TickerBar'

export default function HomePage() {
  const [datos, setDatos] = useState<HomeResponse | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let montado = true

    homeApi
      .getHome()
      .then((home) => {
        if (!montado) return
        setDatos(home)
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
  }, [])

  const elementosTicker = useMemo(() => {
    if (!datos) return []

    return [
      ...datos.partidosEnVivo.map((partido) => ({
        label: partido.torneoNombre ?? 'En vivo',
        text: `${formatearEtapaPartido(partido)} en curso`,
      })),
      ...datos.proximosTorneos.map((torneo) => ({
        label: torneo.nombre,
        text: `${formatearEnum(torneo.estado)} - ${formatearFecha(torneo.fechaInicio)}`,
      })),
      ...datos.ultimosResultados.map((partido) => ({
        label: partido.torneoNombre ?? 'Resultado',
        text: `${formatearPareja(partido, 'local')} vs ${formatearPareja(partido, 'visitante')}`,
      })),
    ].slice(0, 10)
  }, [datos])

  if (cargando) {
    return <section className="hp-loading"><StatusMessage title="Cargando..." type="loading" /></section>
  }

  if (error) {
    return <section className="hp-loading"><StatusMessage title="Error" description={error} type="error" /></section>
  }

  if (!datos) {
    return <section className="hp-loading"><StatusMessage title="Sin datos" /></section>
  }

  const torneo = datos.torneoDestacado
    ?? datos.proximosTorneos.find((t) => t.estado !== 'EN_CURSO')
    ?? datos.proximosTorneos[0]
    ?? null
  const otrosTorneos = datos.proximosTorneos.filter((t) => t.id !== torneo?.id).slice(0, 5)
  const torneoCategorias = ordenarCategorias(torneo?.categorias.length
    ? torneo.categorias
    : datos.proximosTorneos.find((item) => item.categorias.length > 0)?.categorias ?? [])

  const resultadosVisibles = datos.ultimosResultados.slice(0, 6)
  const campeonesVisibles = datos.ultimosCampeones.slice(0, 5)
  const torneoFotoUrl = resolveApiAssetUrl(torneo?.imagenUrl)

  return (
    <main className="homepage">
      <section className="hero">
        <div className="hero-photo">
          <img src="/images/tapia.png" alt="Jugador de padel" loading="eager" />
          <div className="hero-headline">
            <div className="hero-eyebrow">
              <Users size={14} />
              TEMPORADA 2026
            </div>
            <h1 className="hero-title">
              {brand.name}
              <br />
              <em>{brand.location}</em>
            </h1>
          </div>
        </div>

        <div className="hero-panel">
          <div className="hp-tag">RANKING PROVINCIAL</div>
          <h2 className="hp-headline">Resultados, torneos y rankings en tiempo real</h2>
          <p className="hp-desc">
            Toda la actividad competitiva del circuito provincial conectada en tiempo real con tu base de datos.
          </p>

          <div className="hero-stats">
            <TarjetaDato icon={Users} value={datos.summary.jugadoresRegistrados} label="Jugadores activos" />
            <TarjetaDato icon={Trophy} value={datos.summary.torneosActivos} label="Torneos en 2026" />
            <TarjetaDato icon={Check} value={datos.summary.partidosFinalizados} label="Partidos finalizados" />
            <TarjetaDato icon={Grid2X2} value={datos.summary.categoriasActivas} label="Categorías activas" />
          </div>

          <div className="hero-cta-row">
            <NavLink to="/torneos" className="btn-primary">
              <Trophy size={17} />
              Ver torneos
            </NavLink>
            <NavLink to="/ranking" className="btn-secondary">
              Ver ranking oficial
            </NavLink>
          </div>
        </div>
      </section>

      <TickerBar items={elementosTicker} />

      <section className="torneo-section">
        <div className="torneo-grid">
          <div className="tp">
            {torneo ? (
              <>
                <div className="tp-eyebrow">
                  <CalendarDays size={14} />
                  {torneo.estado === 'EN_CURSO' ? 'TORNEO EN CURSO' : 'PRÓXIMO TORNEO'}
                </div>

                <div className="tp-live">
                  <div className={`tp-dot${torneo.estado === 'EN_CURSO' ? ' tp-dot-live' : ''}`} />
                  <span className="tp-live-txt">
                    {torneo.estado === 'EN_CURSO' ? 'En curso ahora' : 'Inscripciones abiertas'}
                  </span>
                </div>

                <div className="tp-carousel-slide" key={`slide-${torneo.id}`}>
                  <h2 className="tp-name">{torneo.nombre}</h2>
                  <p className="tp-desc">
                    {torneo.descripcion?.trim()
                      ? torneo.descripcion
                      : 'Torneo válido por el circuito oficial con puntos para el ranking provincial y seguimiento en vivo.'}
                  </p>

                  <div className="tp-fields">
                    <CampoInfo icon={CalendarDays} label="FECHA" value={formatearFecha(torneo.fechaInicio)} />
                    <CampoInfo icon={MapPin} label="LUGAR" value={torneo.lugarNombre ?? 'A confirmar'} />
                    <CampoInfo icon={Grid2X2} label="FORMATO" value={formatearEnum(torneo.formato)} />
                    <CampoInfo icon={Users} label="PAREJAS" value={`${torneo.cantidadParejas} inscriptas`} />
                  </div>

                  <div className="tp-cats-label">CATEGORÍAS</div>
                  <div className="tp-cats">
                    {torneoCategorias.length === 0 ? <span className="tp-cat-badge"><Medal size={13} />Sin categorías cargadas</span> : null}
                    {torneoCategorias.map((cat) => <span key={cat.id} className="tp-cat-badge"><Medal size={13} />{cat.nombre}</span>)}
                  </div>

                  <div className="tp-prog-wrap">
                    {torneo.categorias.length === 0 ? (
                      <div className="tp-prog-row">
                        <span>INSCRIPCIONES</span>
                        <span className="tp-prog-count">{torneo.cantidadParejas}</span>
                      </div>
                    ) : null}
                    {ordenarCategorias(torneo.categorias).map((cat) => {
                      const inscriptas = torneo.parejasPorCategoria?.[cat.id] ?? 0
                      const cupo = torneo.cuposPorCategoria?.[cat.id] ?? null
                      const lleno = cupo != null && cupo > 0 && inscriptas >= cupo
                      const ancho = cupo != null && cupo > 0
                        ? Math.min(100, (inscriptas / cupo) * 100)
                        : Math.min(100, inscriptas * 10)
                      return (
                        <div key={cat.id} className="tp-prog-item">
                          <div className="tp-prog-row">
                            <span>{cat.nombre}</span>
                            <span className={`tp-prog-count${lleno ? ' tp-prog-count--lleno' : ''}`}>
                              {cupo != null && cupo > 0
                                ? `${inscriptas}/${cupo}`
                                : `${inscriptas} INSCRIPTAS`}
                            </span>
                          </div>
                          <div className="tp-prog-bar">
                            <div className="tp-prog-fill" style={{ width: `${ancho}%`, background: lleno ? '#c0392b' : undefined }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="tp-actions">
                  {torneo.estado === 'INSCRIPCION' ? (
                    <NavLink to={`/torneos/${torneo.id}/inscribirme`} className="btn-primary">
                      <NotebookPen size={17} />
                      Inscribirme
                    </NavLink>
                  ) : null}
                  <NavLink to={`/torneos/${torneo.id}`} className={torneo.estado === 'INSCRIPCION' ? 'btn-ghost' : 'btn-primary'}>
                    <ArrowRight size={17} />
                    Ver detalle
                  </NavLink>
                </div>
              </>
            ) : (
              <StatusMessage title="No hay torneo destacado" />
            )}
          </div>

          <div className="tp-photo">
            <img key={torneo?.id ?? 'sin-torneo'} src={torneoFotoUrl ?? '/images/galan.jpg'} alt={torneo?.nombre ?? 'Próximo torneo'} loading="lazy" />
            <div className="tp-photo-glass">
              <h2 className="tp-photo-title">{torneo?.nombre ?? 'Próximo torneo'}</h2>
              <div className="date-glass">
                <span className="dg-day">{torneo?.fechaInicio ? new Date(torneo.fechaInicio).getDate() : '--'}</span>
                <div className="dg-right">
                  <div className="dg-month">
                    {torneo?.fechaInicio
                      ? new Date(torneo.fechaInicio).toLocaleDateString('es-AR', { month: 'short' }).toUpperCase().replace('.', '')
                      : '---'}
                  </div>
                  <div className="dg-year">{torneo?.fechaInicio ? new Date(torneo.fechaInicio).getFullYear() : ''}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {otrosTorneos.length > 0 && (
          <div className="tp-row">
            <div className="tp-row-head">
              <div className="tp-row-eyebrow">PRÓXIMOS</div>
              <h3 className="tp-row-title">Más torneos en camino</h3>
            </div>
            <NavLink to="/torneos" className="tp-row-all">
              Ver todos
              <ArrowRight size={15} />
            </NavLink>
            <div className="tp-cards">
              {otrosTorneos.map((item) => (
                <TorneoCard key={item.id} torneo={item} />
              ))}
            </div>
          </div>
        )}
      </section>

      <TickerBar items={elementosTicker} variant="results" />

      <section className="results-section">
        <div className="results-inner">
          <div className="results-block">
            <div className="section-header">
              <div className="sh-left">
                <div className="section-title">Últimos resultados</div>
                <div className="section-sub">TEMPORADA 2026</div>
              </div>
              <NavLink to="/torneos" className="see-all">
                Ver todos los resultados
                <ArrowRight size={15} />
              </NavLink>
            </div>

            {resultadosVisibles.length === 0 ? <div className="home-empty-card">No hay resultados finalizados todavía.</div> : null}

            <div className="match-grid">
              {resultadosVisibles.map((item) => <ResultMatchCard key={item.id} elemento={item} />)}
            </div>
          </div>

          <div className="champs-block">
          <div className="champs-wrap">
            <div className="champs-head">
              <div className="ch-left">
                <div className="ch-icon"><Trophy size={22} /></div>
                <div>
                  <div className="ch-title">Campeones</div>
                  <div className="ch-sub">ÚLTIMOS 5 TORNEOS - TEMPORADA 2026</div>
                </div>
              </div>
              <div className="ch-badge">HISTÓRICO</div>
            </div>

            {campeonesVisibles.length === 0 ? <div className="home-empty-card champs-empty">No hay campeones publicados todavía.</div> : null}

            <table className="champs-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Torneo</th>
                  <th>Pareja campeona</th>
                  <th>Resultado final</th>
                  <th className="ct-cat-head">Categoría</th>
                </tr>
              </thead>
              <tbody>
                {campeonesVisibles.map((item, index) => {
                  const sets = parsearMarcador(item.marcador)
                  const ganador = formatearPareja(item, obtenerLadoGanador(item))

                  return (
                    <tr key={item.id}>
                      <td><div className="ct-num">{String(index + 1).padStart(2, '0')}</div></td>
                      <td>
                        <div className="ct-torneo">{item.torneoNombre ?? 'Torneo'}</div>
                        <div className="ct-fecha">{`${fechaCompacta(item.fechaHora)} - ${item.lugarNombre ?? 'Sede a confirmar'}`}</div>
                      </td>
                      <td>
                        <div className="ct-pair">
                          <div className="ct-trophy"><Trophy size={20} /></div>
                          <div className="ct-names">{ganador}</div>
                        </div>
                      </td>
                      <td>
                        <div className="ct-score">
                          {sets.length > 0 ? sets.map((set) => `${set.local}-${set.visitante}`).join(' / ') : item.marcador ?? 'Sin resultado'}
                        </div>
                      </td>
                      <td className="ct-cat"><span className="ct-pill">{item.categoriaNombre ?? 'Categoría'}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="champ-cards">
              {campeonesVisibles.map((item, index) => (
                <article key={item.id} className="champ-card">
                  <div className="champ-card-row">
                    <div className="champ-card-num">{String(index + 1).padStart(2, '0')}</div>
                    <div className="champ-card-info">
                      <div className="champ-card-torneo">{item.torneoNombre ?? 'Torneo'}</div>
                      <div className="champ-card-fecha">
                        {`${fechaCompacta(item.fechaHora)} - ${item.lugarNombre ?? 'Sede a confirmar'} - ${item.categoriaNombre ?? 'Categoría'}`}
                      </div>
                    </div>
                  </div>
                  <div className="champ-card-winner">
                    <div className="ct-trophy"><Trophy size={20} /></div>
                    <div>
                      <div className="champ-card-names">{formatearPareja(item, obtenerLadoGanador(item))}</div>
                      <div className="champ-card-score">
                        {(() => { const s = parsearMarcador(item.marcador); return s.length > 0 ? s.map((set) => `${set.local}-${set.visitante}`).join(' / ') : (item.marcador ?? 'Sin resultado') })()}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="champs-footer">
              <NavLink to="/torneos" className="see-all">
                Ver todos los campeones
                <ArrowRight size={15} />
              </NavLink>
            </div>
          </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function TarjetaDato({ icon: Icon, value, label }: { icon: typeof Users; value: number; label: string }) {
  return (
    <div className="hstat">
      <div className="hstat-n">{value}</div>
      <div className="hstat-l">
        <Icon size={15} />
        {label}
      </div>
    </div>
  )
}

type Countdown = { dias: number; horas: number; minutos: number; segundos: number } | null

function calcularCountdown(fecha: string | null): Countdown {
  if (!fecha) return null
  const objetivo = new Date(fecha.includes('T') ? fecha : `${fecha}T00:00:00`).getTime()
  const restante = objetivo - Date.now()
  if (Number.isNaN(objetivo) || restante <= 0) return null
  const segundosTotales = Math.floor(restante / 1000)
  return {
    dias: Math.floor(segundosTotales / 86400),
    horas: Math.floor((segundosTotales % 86400) / 3600),
    minutos: Math.floor((segundosTotales % 3600) / 60),
    segundos: segundosTotales % 60,
  }
}

function useCountdown(fecha: string | null): Countdown {
  const [valor, setValor] = useState<Countdown>(() => calcularCountdown(fecha))

  useEffect(() => {
    setValor(calcularCountdown(fecha))
    const id = setInterval(() => setValor(calcularCountdown(fecha)), 1000)
    return () => clearInterval(id)
  }, [fecha])

  return valor
}

function TorneoCard({ torneo }: { torneo: TorneoResponse }) {
  const enVivo = torneo.estado === 'EN_CURSO'
  const countdown = useCountdown(enVivo ? null : torneo.fechaInicio)
  const fotoUrl = resolveApiAssetUrl(torneo.imagenUrl)
  const dosDigitos = (n: number) => String(n).padStart(2, '0')

  return (
    <NavLink to={`/torneos/${torneo.id}`} className="tp-card">
      <img src={fotoUrl ?? '/images/galan.jpg'} alt={torneo.nombre} loading="lazy" />
      <div className="tp-card-top">
        {enVivo ? (
          <span className="tp-card-chip tp-card-chip--live">
            <Radio size={12} />
            EN VIVO
          </span>
        ) : countdown ? (
          <span className="tp-card-chip">
            EMPIEZA EN {countdown.dias > 0 ? `${countdown.dias}d ` : ''}
            {dosDigitos(countdown.horas)}:{dosDigitos(countdown.minutos)}:{dosDigitos(countdown.segundos)}
          </span>
        ) : (
          <span className="tp-card-chip">{formatearEnum(torneo.estado)}</span>
        )}
      </div>
      <div className="tp-card-body">
        <div className="tp-card-date">{fechaCompacta(torneo.fechaInicio)}</div>
        <h4 className="tp-card-name">{torneo.nombre}</h4>
        <div className="tp-card-meta">
          <span>{torneo.cantidadCategorias} cat</span>
          <span className="tp-card-sep" />
          <span>{torneo.cantidadParejas} parejas</span>
        </div>
      </div>
    </NavLink>
  )
}

function CampoInfo({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div>
      <div className="tf-label">
        <Icon size={14} />
        {label}
      </div>
      <div className="tf-val">{value}</div>
    </div>
  )
}
