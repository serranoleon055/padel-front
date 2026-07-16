import { CalendarClock, CalendarDays, ClipboardList, Clock, LayoutGrid, Sparkles, Trophy, Users, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

import { placesApi } from '@/features/catalog/catalogApi'
import { homeApi } from '@/features/home/homeApi'
import { reservasApi } from '@/features/reservas/reservasApi'
import type { SlotDisponibilidad } from '@/features/reservas/reservasApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { formatearFecha, formatearMoneda } from '@/shared/lib/formatters'
import type { AdminDashboardResponse, LugarResponse, TurnoResumenResponse } from '@/shared/types/api'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { NavegadorFase } from '@/shared/ui/NavegadorFase'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { StatusMessage } from '@/shared/ui/StatusMessage'

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function hoyISO() {
  const ahora = new Date()
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

type ReservaPendiente = AdminDashboardResponse['reservasPendientesLista'][number]

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [lugares, setLugares] = useState<LugarResponse[]>([])
  const [lugarId, setLugarId] = useState<number | null>(null)
  const [panel, setPanel] = useState<AdminDashboardResponse | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [indiceCancha, setIndiceCancha] = useState(0)
  const [indiceReserva, setIndiceReserva] = useState(0)
  const [modalReservas, setModalReservas] = useState(false)
  const [modalInscripciones, setModalInscripciones] = useState(false)
  const [modalCanchas, setModalCanchas] = useState(false)
  const [modalDisponibles, setModalDisponibles] = useState(false)
  const [disponiblesPorCancha, setDisponiblesPorCancha] = useState<{ canchaNombre: string; slots: SlotDisponibilidad[] }[]>([])
  const [indiceDisponible, setIndiceDisponible] = useState(0)
  const [cargandoDisponibles, setCargandoDisponibles] = useState(false)
  const [accionando, setAccionando] = useState<number | null>(null)

  useEffect(() => {
    placesApi.getAll()
      .then((datos) => {
        setLugares(datos)
        setLugarId((actual) => actual ?? (datos.length > 0 ? datos[0].id : null))
        if (datos.length === 0) setCargando(false)
      })
      .catch(() => { setLugares([]); setCargando(false) })
  }, [])

  async function cargarPanel(lugar: number) {
    setCargando(true)
    try {
      const datos = await homeApi.getAdminDashboard(lugar)
      setPanel(datos)
      setError(null)
      setIndiceCancha(0)
      setIndiceReserva(0)
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { if (lugarId != null) void cargarPanel(lugarId) }, [lugarId])

  const turnosPorCancha = useMemo(() => {
    if (!panel) return [] as { canchaNombre: string; turnos: TurnoResumenResponse[] }[]
    return panel.canchas.map((cancha) => ({
      canchaNombre: cancha.nombre,
      turnos: panel.proximosTurnosHoy.filter((turno) => turno.canchaId === cancha.id),
    }))
  }, [panel])

  const reservasPorCancha = useMemo(() => {
    if (!panel) return [] as { canchaNombre: string; reservas: ReservaPendiente[] }[]
    return panel.canchas
      .map((cancha) => ({
        canchaNombre: cancha.nombre,
        reservas: panel.reservasPendientesLista.filter((reserva) => reserva.canchaId === cancha.id),
      }))
      .filter((grupo) => grupo.reservas.length > 0)
  }, [panel])

  if (cargando && !panel) return <section className="py-8"><StatusMessage type="loading" title="Cargando panel..." /></section>
  if (lugares.length === 0) return <section className="py-8"><StatusMessage type="empty" title="No hay lugares" description="Creá una sede en Lugares para ver el panel." /></section>
  if (error) return <section className="py-8"><StatusMessage type="error" title="Error al cargar" description={error} /></section>
  if (!panel) return <section className="py-8"><StatusMessage type="empty" title="Sin datos" /></section>

  const { summary: resumen, temporadaActiva, ultimosTorneos } = panel
  const torneosRecientes = ultimosTorneos.slice(0, 3)
  const canchaActual = turnosPorCancha.length > 0 ? turnosPorCancha[Math.min(indiceCancha, turnosPorCancha.length - 1)] : undefined
  const reservaCanchaActual = reservasPorCancha.length > 0 ? reservasPorCancha[Math.min(indiceReserva, reservasPorCancha.length - 1)] : undefined

  async function abrirDisponibles() {
    setModalDisponibles(true)
    setIndiceDisponible(0)
    setCargandoDisponibles(true)
    try {
      const hoy = hoyISO()
      const resultados = await Promise.all(
        panel!.canchas.map(async (cancha) => ({
          canchaNombre: cancha.nombre,
          slots: (await reservasApi.getDisponibilidad(cancha.id, hoy)).filter((slot) => slot.disponible),
        })),
      )
      setDisponiblesPorCancha(resultados)
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    } finally {
      setCargandoDisponibles(false)
    }
  }

  async function operarReserva(id: number, accion: 'confirmar' | 'rechazar') {
    setAccionando(id)
    try {
      if (accion === 'confirmar') await reservasApi.confirmar(id)
      else await reservasApi.rechazar(id)
      if (lugarId != null) await cargarPanel(lugarId)
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    } finally {
      setAccionando(null)
    }
  }

  return (
    <section className="admin-page">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-rp-accent">Admin</p>
      <h1 className="mt-2 text-3xl font-black text-rp-text sm:text-5xl">Panel</h1>

      {lugares.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-1 rounded-lg border border-rp-border bg-rp-surface/82 p-1">
          {lugares.map((lugar) => (
            <button
              key={lugar.id}
              type="button"
              onClick={() => setLugarId(lugar.id)}
              className={`flex-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-bold transition ${lugarId === lugar.id ? 'bg-rp-surface-2 text-rp-accent' : 'text-rp-muted hover:text-rp-text'}`}
            >
              {lugar.nombre}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <GraficoBarras titulo="Turnos por día (esta semana)" valores={panel.turnosPorDiaSemana} etiquetas={DIAS_SEMANA} />
        <ProximosTurnos
          cancha={canchaActual}
          indice={indiceCancha}
          total={turnosPorCancha.length}
          onAnterior={() => setIndiceCancha((i) => (i - 1 + turnosPorCancha.length) % turnosPorCancha.length)}
          onSiguiente={() => setIndiceCancha((i) => (i + 1) % turnosPorCancha.length)}
        />
      </div>

      <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-rp-accent">Hoy en la sede</p>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <TarjetaMetrica icon={LayoutGrid} label="Canchas ocupadas ahora" texto={`${panel.canchasOcupadasAhora}/${panel.canchasTotales}`} onClick={() => setModalCanchas(true)} />
        <TarjetaMetrica icon={Sparkles} label="Turnos disponibles hoy" value={panel.turnosDisponiblesHoy} onClick={abrirDisponibles} />
        <TarjetaMetrica icon={CalendarClock} label="Turnos confirmados hoy" value={panel.reservasHoy} />
        <TarjetaMetrica icon={Clock} label="Turnos por confirmar" value={panel.reservasPendientes} onClick={() => setModalReservas(true)} />
        <TarjetaMetrica icon={Wallet} label="Ingreso estimado de turnos (hoy)" texto={formatearMoneda(panel.ingresoEstimadoHoy)} />
      </div>

      <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-rp-accent">Competición</p>
      {temporadaActiva && (
        <div className="mt-3 rounded-lg border border-rp-accent/30 bg-rp-accent/5 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-rp-accent">Temporada activa</p>
          <h2 className="mt-2 text-xl font-black text-rp-text">{temporadaActiva.nombre}</h2>
          <p className="mt-1 text-sm text-rp-muted">
            {formatearFecha(temporadaActiva.fechaInicio)} - {temporadaActiva.fechaFin ? formatearFecha(temporadaActiva.fechaFin) : 'En curso'}
          </p>
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <TarjetaMetrica icon={ClipboardList} label="Inscripciones pendientes" value={panel.solicitudesPendientes} onClick={() => setModalInscripciones(true)} />
        <TarjetaMetrica icon={ClipboardList} label="Torneos en inscripción" value={panel.torneosEnInscripcion} onClick={() => navigate('/admin/torneos?estado=INSCRIPCION')} />
        <TarjetaMetrica icon={Trophy} label="Torneos finalizados" value={panel.torneosFinalizados} onClick={() => navigate('/admin/torneos?estado=FINALIZADO')} />
        <TarjetaMetrica icon={Users} label="Jugadores" value={resumen.jugadoresRegistrados} onClick={() => navigate('/admin/jugadores')} />
      </div>

      <div className="mt-5">
        <h3 className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-rp-accent">Últimos torneos en esta sede</h3>
        {torneosRecientes.length === 0 ? (
          <p className="rounded-lg border border-rp-border bg-rp-surface/82 p-4 text-sm text-rp-muted">Todavía no hay torneos en este lugar.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {torneosRecientes.map((torneo) => (
              <NavLink key={torneo.id} to={`/admin/torneos/${torneo.id}?vista=resumen`} className="rounded-lg border border-rp-border bg-rp-surface/82 p-4 transition hover:border-rp-accent/60">
                <StatusBadge tone={torneo.estado === 'EN_CURSO' ? 'live' : torneo.estado === 'FINALIZADO' ? 'success' : 'warning'}>
                  {torneo.estado}
                </StatusBadge>
                <h4 className="mt-2 line-clamp-2 font-bold text-rp-text">{torneo.nombre}</h4>
                <p className="mt-1 flex items-center gap-1 text-xs text-rp-muted">
                  <CalendarDays size={12} />{formatearFecha(torneo.fechaInicio)}
                </p>
              </NavLink>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={modalCanchas} onClose={() => setModalCanchas(false)} title="Estado de las canchas ahora" size="md">
        {panel.canchas.length === 0 ? (
          <p className="py-6 text-center text-sm text-rp-muted">Este lugar no tiene canchas activas.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {panel.canchas.map((cancha) => (
              <li key={cancha.id} className="flex items-center justify-between rounded-md border border-rp-border bg-rp-bg/55 px-3 py-2">
                <span className="text-sm font-bold text-rp-text">{cancha.nombre}</span>
                <StatusBadge tone={cancha.ocupadaAhora ? 'danger' : 'success'}>{cancha.ocupadaAhora ? 'Ocupada' : 'Libre'}</StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal isOpen={modalDisponibles} onClose={() => setModalDisponibles(false)} title="Turnos disponibles hoy" size="md">
        {cargandoDisponibles ? (
          <p className="py-6 text-center text-sm text-rp-muted">Cargando disponibilidad...</p>
        ) : disponiblesPorCancha.length === 0 ? (
          <p className="py-6 text-center text-sm text-rp-muted">Este lugar no tiene canchas.</p>
        ) : (
          (() => {
            const canchaActualDisp = disponiblesPorCancha[Math.min(indiceDisponible, disponiblesPorCancha.length - 1)]
            return (
              <div className="flex flex-col gap-3">
                <NavegadorFase
                  etiqueta={canchaActualDisp.canchaNombre}
                  indice={Math.min(indiceDisponible, disponiblesPorCancha.length - 1)}
                  total={disponiblesPorCancha.length}
                  onAnterior={() => setIndiceDisponible((i) => (i - 1 + disponiblesPorCancha.length) % disponiblesPorCancha.length)}
                  onSiguiente={() => setIndiceDisponible((i) => (i + 1) % disponiblesPorCancha.length)}
                />
                {canchaActualDisp.slots.length === 0 ? (
                  <p className="py-4 text-center text-sm text-rp-muted">Esta cancha no tiene turnos libres para hoy.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {canchaActualDisp.slots.map((slot) => (
                      <span key={slot.horaInicio} className="rounded-md border border-rp-accent/50 bg-rp-accent/10 px-2 py-1.5 text-center text-sm font-bold text-rp-text">
                        {slot.horaInicio.slice(0, 5)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })()
        )}
      </Modal>

      <Modal isOpen={modalReservas} onClose={() => setModalReservas(false)} title="Turnos por confirmar" size="md">
        {reservasPorCancha.length === 0 || !reservaCanchaActual ? (
          <p className="py-6 text-center text-sm text-rp-muted">No hay turnos pendientes de confirmación.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <NavegadorFase
              etiqueta={reservaCanchaActual.canchaNombre}
              indice={Math.min(indiceReserva, reservasPorCancha.length - 1)}
              total={reservasPorCancha.length}
              onAnterior={() => setIndiceReserva((i) => (i - 1 + reservasPorCancha.length) % reservasPorCancha.length)}
              onSiguiente={() => setIndiceReserva((i) => (i + 1) % reservasPorCancha.length)}
            />
            <ul className="flex flex-col gap-2">
              {reservaCanchaActual.reservas.map((reserva) => (
                <li key={reserva.id} className="flex flex-wrap items-center gap-3 rounded-md border border-rp-border bg-rp-bg/55 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-rp-text">{reserva.clienteNombre} <span className="text-xs font-normal text-rp-muted">{reserva.clienteTelefono}</span></p>
                    <p className="text-xs text-rp-muted">{reserva.fecha ? formatearFecha(reserva.fecha) : ''} {reserva.horaInicio?.slice(0, 5)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" disabled={accionando === reserva.id} onClick={() => operarReserva(reserva.id, 'confirmar')}>Confirmar</Button>
                    <Button size="sm" variant="ghost" disabled={accionando === reserva.id} onClick={() => operarReserva(reserva.id, 'rechazar')}>Rechazar</Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>

      <Modal isOpen={modalInscripciones} onClose={() => setModalInscripciones(false)} title="Inscripciones pendientes" size="md">
        {panel.solicitudesPendientesLista.length === 0 ? (
          <p className="py-6 text-center text-sm text-rp-muted">No hay inscripciones pendientes.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {panel.solicitudesPendientesLista.map((solicitud) => (
              <li key={solicitud.id} className="flex flex-wrap items-center gap-3 rounded-md border border-rp-border bg-rp-bg/55 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-rp-text">{solicitud.jugador1} / {solicitud.jugador2}</p>
                  <p className="text-xs text-rp-muted">
                    {solicitud.torneoNombre ? `${solicitud.torneoNombre} · ` : ''}{solicitud.categoriaNombre}{solicitud.telefonoContacto ? ` · ${solicitud.telefonoContacto}` : ''}
                  </p>
                </div>
                {solicitud.torneoId && (
                  <Button size="sm" variant="subtle" asChild onClick={() => setModalInscripciones(false)}>
                    <NavLink to={`/admin/torneos/${solicitud.torneoId}`}>Ver torneo</NavLink>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </section>
  )
}

function TarjetaMetrica({ icon: Icon, label, value, texto, onClick }: { icon: typeof Trophy; label: string; value?: number; texto?: string; onClick?: () => void }) {
  const contenido = (
    <>
      <div className="flex items-center justify-between">
        <Icon className="text-rp-accent" size={20} />
        {onClick && <span className="text-xs font-bold text-rp-muted transition group-hover:text-rp-accent">Ver →</span>}
      </div>
      <span className="mt-3 block text-sm font-bold text-rp-muted">{label}</span>
      <strong className="mt-2 block text-3xl font-black text-rp-text">{texto ?? value}</strong>
    </>
  )
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="group cursor-pointer rounded-lg border border-rp-border bg-rp-surface p-4 text-left transition hover:border-rp-accent/60 hover:bg-rp-surface-2/40">
        {contenido}
      </button>
    )
  }
  return <article className="rounded-lg border border-rp-border bg-rp-surface p-4">{contenido}</article>
}

function GraficoBarras({ titulo, valores, etiquetas }: { titulo: string; valores: number[]; etiquetas: string[] }) {
  const maximo = Math.max(1, ...valores)
  return (
    <div className="flex h-full flex-col rounded-lg border border-rp-border bg-rp-surface/82 p-4">
      <h3 className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-rp-accent">{titulo}</h3>
      <div className="flex flex-1 items-end gap-3" style={{ minHeight: 132 }}>
        {valores.map((valor, indice) => (
          <div key={indice} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-xs font-bold text-rp-muted">{valor}</span>
            <div className="w-full rounded-t bg-rp-accent/70" style={{ height: `${Math.max(2, (valor / maximo) * 96)}px` }} />
            <span className="text-[10px] font-bold uppercase text-rp-muted">{etiquetas[indice]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProximosTurnos({ cancha, indice, total, onAnterior, onSiguiente }: {
  cancha: { canchaNombre: string; turnos: TurnoResumenResponse[] } | undefined
  indice: number
  total: number
  onAnterior: () => void
  onSiguiente: () => void
}) {
  return (
    <div className="rounded-lg border border-rp-border bg-rp-surface/82 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-[0.16em] text-rp-accent">Próximos turnos de hoy</h3>
        <NavLink to="/admin/turnos" className="text-xs font-bold text-rp-muted hover:text-rp-accent">Ver todos</NavLink>
      </div>
      {!cancha || total === 0 ? (
        <p className="py-6 text-center text-sm text-rp-muted">Este lugar no tiene canchas.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <NavegadorFase etiqueta={cancha.canchaNombre} indice={Math.min(indice, total - 1)} total={total} onAnterior={onAnterior} onSiguiente={onSiguiente} />
          {cancha.turnos.length === 0 ? (
            <p className="py-4 text-center text-sm text-rp-muted">Esta cancha no tiene turnos confirmados para hoy.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {[...cancha.turnos].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)).map((turno, i) => (
                <li key={i} className="flex items-center gap-3 rounded-md border border-rp-border bg-rp-surface px-3 py-2">
                  <span className="font-mono text-sm font-black text-rp-accent">{turno.horaInicio.slice(0, 5)}</span>
                  <p className="min-w-0 flex-1 truncate text-sm font-bold text-rp-text">{turno.clienteNombre}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
