import { CalendarClock, CalendarRange, ClipboardList, LayoutGrid, Package, Plus, ShoppingCart, Sparkles, Trophy, Wallet } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'

import { cajaApi, MEDIOS, type MedioPago } from '@/features/caja/cajaApi'
import { placesApi } from '@/features/catalog/catalogApi'
import { homeApi } from '@/features/home/homeApi'
import { inscripcionesApi } from '@/features/inscripciones/inscripcionesApi'
import { reservasApi, type OpcionDuracion, type ReservaResponse, type SlotDisponibilidad } from '@/features/reservas/reservasApi'
import { turnosFijosApi, type DisponibilidadAbonos } from '@/features/reservas/turnosFijosApi'
import { productosApi, type ProductoResponse } from '@/features/ventas/ventasApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { porNombreDeCancha } from '@/shared/lib/canchas'
import { fechaISO, formatearFechaLarga, formatearMoneda } from '@/shared/lib/formatters'
import type { AdminDashboardResponse, LugarResponse, SolicitudPendienteResumen } from '@/shared/types/api'
import { VentaRapidaModal } from '@/pages/admin/VentaRapidaModal'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { NavegadorFase } from '@/shared/ui/NavegadorFase'
import { Pagination } from '@/shared/ui/Pagination'
import { Select } from '@/shared/ui/Select'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { StatusMessage } from '@/shared/ui/StatusMessage'
import { useToast } from '@/shared/ui/Toast'

const PRODUCTOS_POR_PAGINA = 6

type Detalle = 'canchas' | 'cobrar' | 'confirmar' | 'reponer' | 'disponibles' | 'inscripciones' | 'abonos' | null

function hora(valor: string) {
  return valor.slice(0, 5)
}

/**
 * Cuándo arranca de verdad el turno. Viene resuelto del backend porque pegar `fecha` con
 * `horaInicio` miente en la madrugada: un turno de la 1 AM se guarda con la fecha del día
 * anterior —es la sesión que arrancó esa noche— y la cuenta daba 24 horas antes.
 */
function inicioDe(turno: ReservaResponse) {
  return new Date(turno.inicioReal ?? `${turno.fecha}T${turno.horaInicio}`)
}

function finDe(turno: ReservaResponse) {
  return new Date(inicioDe(turno).getTime() + turno.duracionMin * 60000)
}

/**
 * Del turno más temprano al más tarde **de la jornada**, no del reloj: se compara el
 * inicio real, así un turno de la 1 AM queda al final de la noche y no arriba de todo.
 */
function porHorario(a: ReservaResponse, b: ReservaResponse) {
  return inicioDe(a).getTime() - inicioDe(b).getTime()
}

export function duracionCorta(minutos: number) {
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  if (horas === 0) return `${resto} min`
  return resto === 0 ? `${horas} h` : `${horas} h ${resto}`
}

/**
 * Agrupa por una clave conservando el orden en que aparecen y descartando los grupos
 * vacíos. Es lo que alimenta a los navegadores de flecha: cada modal muestra una cancha
 * (o un torneo) por vez, no todo mezclado.
 */
function agrupar<T>(items: T[], clave: (item: T) => string) {
  const grupos = new Map<string, T[]>()
  for (const item of items) {
    const k = clave(item)
    if (!grupos.has(k)) grupos.set(k, [])
    grupos.get(k)!.push(item)
  }
  return [...grupos.entries()].map(([etiqueta, elementos]) => ({ etiqueta, elementos }))
}

/**
 * El Panel es la pantalla del que está atendiendo, no un tablero de análisis.
 *
 * <p>Cada tarjeta es un número que se puede abrir: adentro está el detalle accionable
 * —quién, hasta cuándo, cuánto debe— y los botones para resolverlo sin cambiar de
 * pantalla. Los listados largos se recorren de a una cancha o un torneo por vez, porque
 * en el celular una lista de seis canchas mezcladas no se lee.
 */
export default function AdminDashboardPage() {
  const { success: avisoExito } = useToast()

  const [lugares, setLugares] = useState<LugarResponse[]>([])
  const [lugarId, setLugarId] = useState<number | null>(null)
  const [panel, setPanel] = useState<AdminDashboardResponse | null>(null)
  const [turnos, setTurnos] = useState<ReservaResponse[]>([])
  const [productos, setProductos] = useState<ProductoResponse[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accionando, setAccionando] = useState<number | null>(null)

  const [detalle, setDetalle] = useState<Detalle>(null)
  const [indiceGrupo, setIndiceGrupo] = useState(0)
  /** La cancha que se está mirando en "Próximos turnos". Es del panel, no de los modales. */
  const [indiceCancha, setIndiceCancha] = useState(0)
  const [paginaProductos, setPaginaProductos] = useState(1)

  const [disponibles, setDisponibles] = useState<{ id: number; etiqueta: string; slots: SlotDisponibilidad[] }[]>([])
  const [cargandoDisponibles, setCargandoDisponibles] = useState(false)

  const [abonos, setAbonos] = useState<DisponibilidadAbonos | null>(null)

  const [slotNuevo, setSlotNuevo] = useState<
    { canchaId: number; canchaNombre: string; horaInicio: string; opciones: OpcionDuracion[] } | null
  >(null)
  const [formNuevo, setFormNuevo] = useState({ nombre: '', telefono: '', duracion: 60 })
  const [guardandoNuevo, setGuardandoNuevo] = useState(false)
  const [errorNuevo, setErrorNuevo] = useState<string | null>(null)

  const [turnoVenta, setTurnoVenta] = useState<ReservaResponse | null>(null)
  const [ventaSuelta, setVentaSuelta] = useState(false)
  const [turnoCobro, setTurnoCobro] = useState<ReservaResponse | null>(null)
  const [formCobro, setFormCobro] = useState<{ monto: string; medio: MedioPago }>({ monto: '', medio: 'EFECTIVO' })
  const [cobrando, setCobrando] = useState(false)
  const [errorCobro, setErrorCobro] = useState<string | null>(null)

  useEffect(() => {
    placesApi.getAll()
      .then((datos) => {
        setLugares(datos)
        setLugarId((actual) => actual ?? (datos.length > 0 ? datos[0].id : null))
        if (datos.length === 0) setCargando(false)
      })
      .catch(() => { setLugares([]); setCargando(false) })
  }, [])

  // Sin fecha: el backend responde la jornada que el club está atendiendo. Pedir "hoy"
  // dejaba la pantalla vacía a la 1 AM, cuando lo que se juega es de la sesión de ayer.
  const cargar = useCallback(async (lugar: number) => {
    setCargando(true)
    try {
      const [datosPanel, datosTurnos, datosProductos] = await Promise.all([
        homeApi.getAdminDashboard(lugar),
        reservasApi.delDia(),
        productosApi.getAll(),
      ])
      setPanel(datosPanel)
      setTurnos(datosTurnos)
      setProductos(datosProductos)
      setError(null)
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { if (lugarId != null) void cargar(lugarId) }, [lugarId, cargar])
  useEffect(() => { setIndiceGrupo(0); setPaginaProductos(1) }, [detalle])

  const canchasDelLugar = useMemo(
    () => new Set((panel?.canchas ?? []).map((cancha) => cancha.id)),
    [panel],
  )

  /**
   * Reparte los turnos de la jornada en bloques que no se pisan y no dejan a ninguno
   * afuera. Se clasifica **primero por el momento y recién después por la deuda**: un
   * turno de las 21 que todavía no se pagó es un turno por venir, no un moroso, y
   * mirando la deuda primero se iba al bloque de los que ya jugaron. La plata que debe
   * igual se ve en su fila, así que no se pierde nada.
   */
  const { jugando, conDeuda, porVenir, porConfirmar, aCobrar } = useMemo(() => {
    const ahora = new Date()
    const jugando: ReservaResponse[] = []
    const conDeuda: ReservaResponse[] = []
    const porVenir: ReservaResponse[] = []
    const porConfirmar: ReservaResponse[] = []
    let aCobrar = 0

    for (const turno of turnos) {
      if (canchasDelLugar.size > 0 && !canchasDelLugar.has(turno.canchaId)) continue
      const saldo = turno.saldoPendiente ?? 0
      // Un turno sin confirmar no se cobra: primero hay que aprobarlo.
      const cobrable = turno.estado !== 'PENDIENTE'
      if (cobrable) aCobrar += saldo

      if (!cobrable) porConfirmar.push(turno)
      else if (inicioDe(turno) > ahora) porVenir.push(turno)
      else if (ahora < finDe(turno)) jugando.push(turno)
      else if (saldo > 0) conDeuda.push(turno)
      // Los que ya se jugaron y están pagos no se muestran: no hay nada que hacer.
    }
    jugando.sort(porNombreDeCancha((t) => t.canchaNombre))
    conDeuda.sort(porHorario)
    return { jugando, conDeuda, porVenir, porConfirmar, aCobrar }
  }, [turnos, canchasDelLugar])

  /** Todo lo que falta cobrar de la jornada, se haya jugado ya o no. */
  const deudores = useMemo(
    () => turnos
      .filter((t) => (canchasDelLugar.size === 0 || canchasDelLugar.has(t.canchaId))
        && t.estado !== 'PENDIENTE' && (t.saldoPendiente ?? 0) > 0)
      .sort(porHorario),
    [turnos, canchasDelLugar],
  )

  const bajoMinimo = useMemo(
    () => productos
      .filter((p) => p.activo && p.controlaStock && p.stock <= p.stockMinimo)
      .sort((a, b) => (a.stock - a.stockMinimo) - (b.stock - b.stockMinimo)),
    [productos],
  )

  /** Qué está pasando en cada cancha ahora mismo: la cancha y su turno en curso. */
  const estadoCanchas = useMemo(() => (panel?.canchas ?? [])
    .map((cancha) => ({
      ...cancha,
      turno: jugando.find((t) => t.canchaId === cancha.id) ?? null,
    }))
    .sort(porNombreDeCancha((cancha) => cancha.nombre)), [panel, jugando])

  const proximosPorCancha = useMemo(
    () => agrupar([...porVenir].sort(porHorario), (t) => t.canchaNombre)
      .sort(porNombreDeCancha((grupo) => grupo.etiqueta)),
    [porVenir],
  )
  const porConfirmarPorCancha = useMemo(
    () => agrupar([...porConfirmar].sort(porHorario), (t) => t.canchaNombre)
      .sort(porNombreDeCancha((grupo) => grupo.etiqueta)),
    [porConfirmar],
  )
  const inscripcionesPorTorneo = useMemo(
    () => agrupar(panel?.solicitudesPendientesLista ?? [], (s) => s.torneoNombre ?? 'Sin torneo'),
    [panel],
  )

  const cargarDisponibles = useCallback(async () => {
    if (!panel) return
    setCargandoDisponibles(true)
    try {
      // La misma jornada que mide el resto del panel, y solo los horarios que todavía
      // se pueden vender: los que ya pasaron no vienen en la respuesta.
      const resultados = await Promise.all([...panel.canchas]
        .sort(porNombreDeCancha((cancha) => cancha.nombre))
        .map(async (cancha) => ({
          id: cancha.id,
          etiqueta: cancha.nombre,
          slots: (await reservasApi.getDisponibilidad(cancha.id, panel.fechaJornada)).filter((s) => s.disponible),
        })))
      setDisponibles(resultados)
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    } finally {
      setCargandoDisponibles(false)
    }
  }, [panel])

  function abrirDisponibles() {
    setDetalle('disponibles')
    void cargarDisponibles()
  }

  /**
   * La grilla de abonos contesta "¿qué turno fijo me queda para vender?", que es lo que el
   * club publica cada semana. Se carga con el panel y no al abrir el modal porque el
   * número va en la tarjeta: abrirla para enterarse de cuánto hay sería al revés.
   */
  useEffect(() => {
    let vigente = true
    turnosFijosApi.disponibilidadSemanal(lugarId)
      .then((datos) => { if (vigente) setAbonos(datos) })
      .catch(() => { if (vigente) setAbonos(null) })
    return () => { vigente = false }
  }, [lugarId])

  const franjasLibresAbono = useMemo(
    () => (abonos?.dias ?? []).reduce(
      (total, dia) => total + dia.canchas.reduce((suma, cancha) => suma + cancha.franjas.length, 0), 0),
    [abonos],
  )

  function abrirTurnoManual(cancha: { id: number; etiqueta: string }, slot: SlotDisponibilidad) {
    setSlotNuevo({
      canchaId: cancha.id,
      canchaNombre: cancha.etiqueta,
      horaInicio: slot.horaInicio,
      opciones: slot.opciones,
    })
    // Se propone la duración más corta que el club vende en ese hueco: es la que casi
    // siempre se pide y la que seguro entra.
    setFormNuevo({ nombre: '', telefono: '', duracion: slot.opciones[0]?.minutos ?? 60 })
    setErrorNuevo(null)
  }

  /**
   * Cargar un turno a mano sobre un horario libre: el que llama por teléfono o se
   * presenta en el mostrador. Se confirma en el acto —lo está tomando el club, no hay
   * nada que aprobar después— y se recarga la disponibilidad para que el hueco
   * desaparezca de la lista sin cerrar el modal.
   */
  async function guardarTurnoManual() {
    if (!slotNuevo) return
    if (!formNuevo.nombre.trim() || !formNuevo.telefono.trim()) {
      setErrorNuevo('Completá el nombre y el teléfono.')
      return
    }
    setGuardandoNuevo(true)
    setErrorNuevo(null)
    try {
      const reserva = await reservasApi.solicitar({
        canchaId: slotNuevo.canchaId,
        fecha: panel!.fechaJornada,
        horaInicio: slotNuevo.horaInicio,
        duracionMin: formNuevo.duracion,
        clienteNombre: formNuevo.nombre.trim(),
        clienteTelefono: formNuevo.telefono.trim(),
      })
      await reservasApi.confirmar(reserva.id)
      avisoExito(`Turno cargado: ${slotNuevo.canchaNombre} a las ${hora(slotNuevo.horaInicio)}`)
      setSlotNuevo(null)
      recargar()
      void cargarDisponibles()
    } catch (e: unknown) {
      setErrorNuevo(obtenerMensajeErrorApi(e))
    } finally {
      setGuardandoNuevo(false)
    }
  }

  function abrirCobro(turno: ReservaResponse) {
    setTurnoCobro(turno)
    setFormCobro({ monto: String(turno.saldoPendiente ?? 0), medio: 'EFECTIVO' })
    setErrorCobro(null)
  }

  const recargar = () => { if (lugarId != null) void cargar(lugarId) }

  async function cobrar() {
    if (!turnoCobro) return
    const monto = Number(formCobro.monto.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'))
    if (!Number.isFinite(monto) || monto <= 0) { setErrorCobro('Ingresá un monto válido.'); return }

    setCobrando(true); setErrorCobro(null)
    try {
      await cajaApi.cobrar(turnoCobro.id, { monto, medio: formCobro.medio, notas: null })
      avisoExito(`Cobrado ${formatearMoneda(monto)} a ${turnoCobro.clienteNombre}`)
      setTurnoCobro(null)
      recargar()
    } catch (e: unknown) {
      setErrorCobro(obtenerMensajeErrorApi(e))
    } finally { setCobrando(false) }
  }

  async function resolverTurno(turno: ReservaResponse, accion: 'confirmar' | 'rechazar') {
    setAccionando(turno.id)
    try {
      if (accion === 'confirmar') await reservasApi.confirmar(turno.id)
      else await reservasApi.rechazar(turno.id)
      avisoExito(accion === 'confirmar' ? 'Turno confirmado' : 'Turno rechazado')
      recargar()
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    } finally {
      setAccionando(null)
    }
  }

  async function resolverInscripcion(solicitud: SolicitudPendienteResumen, accion: 'aprobar' | 'rechazar') {
    setAccionando(solicitud.id)
    try {
      if (accion === 'aprobar') await inscripcionesApi.aprobar(solicitud.id)
      else await inscripcionesApi.rechazar(solicitud.id)
      avisoExito(accion === 'aprobar' ? 'Inscripción aprobada' : 'Inscripción rechazada')
      recargar()
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    } finally {
      setAccionando(null)
    }
  }

  if (cargando && !panel) return <section className="py-8"><StatusMessage type="loading" title="Cargando el día..." /></section>
  if (lugares.length === 0) return <section className="py-8"><StatusMessage type="empty" title="No hay sedes" description="Creá una sede en Sedes y canchas para usar el panel." /></section>

  // Cuando la jornada no es la fecha del calendario es porque ya pasó la medianoche y la
  // noche de ayer sigue en curso (o se está terminando de cobrar). Conviene que se lea, o
  // el que atiende cree que la pantalla quedó colgada en el día de ayer.
  const esJornadaDeAnoche = Boolean(panel && panel.fechaJornada !== fechaISO())

  return (
    <section className="admin-page">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-rp-accent">Admin</p>
      <h1 className="mt-2 text-3xl font-black text-rp-text sm:text-5xl">Panel</h1>
      {/* La fecha es la de la JORNADA, no la del calendario: a la 1 AM el club sigue
          atendiendo la noche que arrancó ayer, y todos los números de esta pantalla son
          de esa sesión. Decir "hoy" ahí sería mentir sobre lo que se está mirando. */}
      <p className="mt-2 text-sm text-rp-muted">
        <span className="font-bold capitalize text-rp-text">{formatearFechaLarga(panel?.fechaJornada)}</span>
        {' · '}Lo que está pasando ahora en el club.
        {esJornadaDeAnoche && (
          <span className="mt-1 block text-xs text-rp-amber">
            Seguís en la noche de ayer: los turnos de la madrugada son de esta jornada.
          </span>
        )}
      </p>

      {lugares.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-1 rounded-lg border border-rp-border bg-rp-surface/82 p-1">
          {lugares.map((lugar) => (
            <button
              key={lugar.id}
              type="button"
              onClick={() => setLugarId(lugar.id)}
              className={`min-h-11 flex-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-bold transition ${lugarId === lugar.id ? 'bg-rp-surface-2 text-rp-accent' : 'text-rp-muted hover:text-rp-text'}`}
            >
              {lugar.nombre}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-4 rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{error}</p>}

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Tarjeta
          icono={LayoutGrid}
          titulo="Canchas ocupadas"
          valor={panel ? `${panel.canchasOcupadasAhora}/${panel.canchasTotales}` : '-'}
          detalle="Quién está jugando ahora"
          onClick={() => setDetalle('canchas')}
        />
        <Tarjeta
          icono={Wallet}
          titulo="Falta cobrar"
          valor={formatearMoneda(aCobrar)}
          detalle={`${deudores.length} ${deudores.length === 1 ? 'turno' : 'turnos'} con deuda`}
          tono={aCobrar > 0 ? 'alerta' : 'normal'}
          onClick={() => setDetalle('cobrar')}
        />
        <Tarjeta
          icono={CalendarClock}
          titulo="Por confirmar"
          valor={String(porConfirmar.length)}
          detalle={porConfirmar.length > 0 ? 'Pedidos esperando respuesta' : 'Nada pendiente'}
          tono={porConfirmar.length > 0 ? 'alerta' : 'normal'}
          onClick={() => setDetalle('confirmar')}
        />
        <Tarjeta
          icono={Sparkles}
          titulo="Turnos disponibles"
          valor={String(panel?.turnosDisponiblesHoy ?? 0)}
          detalle={desgloseDisponibles(panel?.disponiblesPorDuracion) ?? 'No queda nada para vender'}
          onClick={abrirDisponibles}
        />
        <Tarjeta
          icono={Trophy}
          titulo="Inscripciones"
          valor={String(panel?.solicitudesPendientes ?? 0)}
          detalle={(panel?.solicitudesPendientes ?? 0) > 0 ? 'Esperando respuesta' : 'Nada pendiente'}
          tono={(panel?.solicitudesPendientes ?? 0) > 0 ? 'alerta' : 'normal'}
          onClick={() => setDetalle('inscripciones')}
        />
        <Tarjeta
          icono={CalendarRange}
          titulo="Abonos por vender"
          valor={abonos ? String(franjasLibresAbono) : '-'}
          detalle={franjasLibresAbono > 0 ? 'Franjas fijas sin ocupar' : 'Todo vendido'}
          onClick={() => setDetalle('abonos')}
        />
        <Tarjeta
          icono={Package}
          titulo="Stock bajo mínimo"
          valor={String(bajoMinimo.length)}
          detalle={bajoMinimo.length > 0 ? bajoMinimo.slice(0, 2).map((p) => p.nombre).join(', ') : 'Todo con stock'}
          tono={bajoMinimo.length > 0 ? 'alerta' : 'normal'}
          onClick={() => setDetalle('reponer')}
        />
      </div>

      {/* La venta de kiosco que no va contra ningún turno —el que entra, compra una
          gatorade y se va— es lo único que el mostrador necesita a un toque desde acá.
          El resto de las pantallas ya están en el menú. */}
      <button
        type="button"
        onClick={() => setVentaSuelta(true)}
        className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-rp-accent/50 bg-rp-accent/10 px-3 py-3 text-sm font-black text-rp-text transition hover:bg-rp-accent/20"
      >
        <ShoppingCart size={17} className="text-rp-accent" />Vender en el mostrador
      </button>

      <Bloque titulo="Jugando ahora" vacio="No hay nadie en la cancha en este momento.">
        {jugando.map((turno) => (
          <FilaTurno key={turno.id} turno={turno} onConsumo={() => setTurnoVenta(turno)} onCobrar={() => abrirCobro(turno)} />
        ))}
      </Bloque>

      {/* Una cancha por vez, recorrida con las flechas: el mismo patrón que los modales del
          panel. Apiladas en columnas, seis canchas obligaban a barrer toda la pantalla para
          contestar la pregunta real ("¿me queda lugar en la 2?"). */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-[0.16em] text-rp-accent">Próximos turnos</h2>
          <NavLink to="/admin/turnos" className="text-xs font-bold text-rp-muted hover:text-rp-accent">Ver todos</NavLink>
        </div>
        {proximosPorCancha.length === 0 ? (
          <p className="rounded-lg border border-rp-border bg-rp-surface/82 px-4 py-3 text-sm text-rp-muted">No queda ningún turno más en la jornada.</p>
        ) : (() => {
          const indice = Math.min(indiceCancha, proximosPorCancha.length - 1)
          const grupo = proximosPorCancha[indice]
          return (
            <div className="flex flex-col gap-2">
              <NavegadorFase
                etiqueta={grupo.etiqueta}
                indice={indice}
                total={proximosPorCancha.length}
                onAnterior={() => setIndiceCancha((i) => (i - 1 + proximosPorCancha.length) % proximosPorCancha.length)}
                onSiguiente={() => setIndiceCancha((i) => (i + 1) % proximosPorCancha.length)}
              />
              {grupo.elementos.map((turno) => (
                <FilaTurno key={turno.id} turno={turno} onConsumo={() => setTurnoVenta(turno)} onCobrar={() => abrirCobro(turno)} />
              ))}
            </div>
          )
        })()}
      </div>

      {conDeuda.length > 0 && (
        <Bloque titulo="Ya jugaron y deben">
          {conDeuda.map((turno) => (
            <FilaTurno key={turno.id} turno={turno} onConsumo={() => setTurnoVenta(turno)} onCobrar={() => abrirCobro(turno)} />
          ))}
        </Bloque>
      )}

      {/* ---------- Detalle de cada tarjeta ---------- */}

      {/* La grilla que el club publica: día por día, qué le queda libre para vender como
          abono. Se recorre por día con las flechas —siete días por seis canchas no entran
          en una pantalla de celular— y cada fila es una cancha con sus franjas. */}
      <Modal isOpen={detalle === 'abonos'} onClose={() => setDetalle(null)} title="Turnos fijos disponibles" size="md">
        {!abonos ? (
          <p className="py-6 text-center text-sm text-rp-muted">Cargando la semana...</p>
        ) : abonos.canchas.length === 0 ? (
          <p className="py-6 text-center text-sm text-rp-muted">Esta sede no tiene canchas activas.</p>
        ) : (() => {
          const indice = Math.min(indiceGrupo, abonos.dias.length - 1)
          const dia = abonos.dias[indice]
          return (
            <div className="flex flex-col gap-3">
              <NavegadorFase
                etiqueta={dia.nombre}
                indice={indice}
                total={abonos.dias.length}
                onAnterior={() => setIndiceGrupo((i) => (i - 1 + abonos.dias.length) % abonos.dias.length)}
                onSiguiente={() => setIndiceGrupo((i) => (i + 1) % abonos.dias.length)}
              />
              <ul className="flex flex-col gap-2">
                {dia.canchas.map((cancha) => (
                  <li key={cancha.canchaId} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-rp-border bg-rp-bg/55 px-3 py-2.5">
                    <span className="text-sm font-black text-rp-text">{cancha.canchaNombre}</span>
                    {cancha.cerrada ? (
                      <span className="text-xs font-bold text-rp-muted">El club no atiende</span>
                    ) : cancha.franjas.length === 0 ? (
                      <span className="text-xs font-bold text-rp-muted">Sin lugar</span>
                    ) : (
                      <span className="flex flex-wrap justify-end gap-1.5">
                        {cancha.franjas.map((franja) => (
                          <span key={franja.horaDesde} className="rounded border border-rp-accent/50 bg-rp-accent/10 px-1.5 py-0.5 font-mono text-xs font-bold text-rp-text">
                            {hora(franja.horaDesde)} a {hora(franja.horaHasta)}
                          </span>
                        ))}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-rp-muted">
                Es lo que queda sin abono todas las semanas. Un turno suelto ya reservado no
                cuenta: el abono se toma igual.
              </p>
            </div>
          )
        })()}
      </Modal>

      <Modal isOpen={detalle === 'canchas'} onClose={() => setDetalle(null)} title="Qué pasa en cada cancha" size="md">
        {estadoCanchas.length === 0 ? (
          <p className="py-6 text-center text-sm text-rp-muted">Esta sede no tiene canchas activas.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {estadoCanchas.map((cancha) => (
              <li key={cancha.id} className="rounded-md border border-rp-border bg-rp-bg/55 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-black text-rp-text">{cancha.nombre}</span>
                  <StatusBadge tone={cancha.ocupadaAhora ? 'danger' : 'success'}>{cancha.ocupadaAhora ? 'Ocupada' : 'Libre'}</StatusBadge>
                </div>
                {cancha.turno ? (
                  <div className="mt-2 border-t border-rp-border pt-2 text-xs">
                    <p className="text-sm font-bold text-rp-text">{cancha.turno.clienteNombre}</p>
                    <p className="text-rp-muted">
                      Hasta las <b className="text-rp-text">{hora(cancha.turno.horaFin)}</b> · {duracionCorta(cancha.turno.duracionMin)}
                      {cancha.turno.turnoFijo ? ' · abono' : ''}
                    </p>
                    <p className="mt-1 text-rp-muted">
                      Cancha {formatearMoneda(cancha.turno.precioAplicado ?? 0)}
                      {(cancha.turno.consumoACuenta ?? 0) > 0 ? ` · consumo ${formatearMoneda(cancha.turno.consumoACuenta ?? 0)}` : ''}
                      {(cancha.turno.seniaPagada ?? 0) > 0 ? ` · seña ${formatearMoneda(cancha.turno.seniaPagada ?? 0)}` : ''}
                    </p>
                    <p className="mt-1 font-black">
                      {(cancha.turno.saldoPendiente ?? 0) > 0
                        ? <span className="text-rp-danger">Debe {formatearMoneda(cancha.turno.saldoPendiente ?? 0)}</span>
                        : <span className="text-rp-accent">Pagado</span>}
                      {cancha.turno.clienteTelefono ? <span className="ml-2 font-normal text-rp-muted">{cancha.turno.clienteTelefono}</span> : null}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-rp-muted">Sin nadie jugando en este momento.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal isOpen={detalle === 'cobrar'} onClose={() => setDetalle(null)} title={`Falta cobrar ${formatearMoneda(aCobrar)}`} size="md">
        {deudores.length === 0 ? (
          <p className="py-6 text-center text-sm text-rp-muted">No queda nada por cobrar en esta jornada.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {deudores.map((turno) => (
              <li key={turno.id} className="rounded-md border border-rp-border bg-rp-bg/55 px-3 py-2.5">
                <p className="text-sm font-black text-rp-text">{turno.clienteNombre}</p>
                <p className="text-xs text-rp-muted">
                  {turno.canchaNombre} · {hora(turno.horaInicio)} a {hora(turno.horaFin)} hs
                  {turno.clienteTelefono ? ` · ${turno.clienteTelefono}` : ''}
                </p>
                <div className="mt-2 flex flex-col gap-0.5 border-t border-rp-border pt-2 text-xs">
                  <span className="flex justify-between"><span className="text-rp-muted">Cancha</span><span className="text-rp-text">{formatearMoneda(turno.precioAplicado ?? 0)}</span></span>
                  {(turno.consumoACuenta ?? 0) > 0 && <span className="flex justify-between"><span className="text-rp-muted">Consumo</span><span className="text-rp-text">{formatearMoneda(turno.consumoACuenta ?? 0)}</span></span>}
                  {(turno.seniaPagada ?? 0) > 0 && <span className="flex justify-between"><span className="text-rp-muted">Seña pagada</span><span className="text-rp-text">-{formatearMoneda(turno.seniaPagada ?? 0)}</span></span>}
                  {(turno.totalCobrado ?? 0) > 0 && <span className="flex justify-between"><span className="text-rp-muted">Ya cobrado</span><span className="text-rp-text">-{formatearMoneda(turno.totalCobrado ?? 0)}</span></span>}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-black text-rp-danger">Debe {formatearMoneda(turno.saldoPendiente ?? 0)}</span>
                  <Button size="sm" onClick={() => { setDetalle(null); abrirCobro(turno) }}><Wallet size={15} />Cobrar</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <ModalPorGrupo
        abierto={detalle === 'confirmar'}
        onClose={() => setDetalle(null)}
        titulo="Turnos por confirmar"
        vacio="No hay turnos esperando respuesta."
        grupos={porConfirmarPorCancha}
        indice={indiceGrupo}
        onIndice={setIndiceGrupo}
        render={(turno) => (
          <li key={turno.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rp-border bg-rp-bg/55 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-rp-text">{hora(turno.horaInicio)} - {hora(turno.horaFin)}</p>
              <p className="truncate text-sm text-rp-text">{turno.clienteNombre}</p>
              <p className="text-xs text-rp-muted">
                {turno.clienteTelefono} · {duracionCorta(turno.duracionMin)} · {formatearMoneda(turno.precioAplicado ?? 0)}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" disabled={accionando === turno.id} onClick={() => resolverTurno(turno, 'confirmar')}>Confirmar</Button>
              <Button size="sm" variant="ghost" disabled={accionando === turno.id} onClick={() => resolverTurno(turno, 'rechazar')}>Rechazar</Button>
            </div>
          </li>
        )}
      />

      <ModalPorGrupo
        abierto={detalle === 'inscripciones'}
        onClose={() => setDetalle(null)}
        titulo="Inscripciones por responder"
        vacio="No hay inscripciones pendientes."
        grupos={inscripcionesPorTorneo}
        indice={indiceGrupo}
        onIndice={setIndiceGrupo}
        render={(solicitud) => {
          // Si el nombre que cargaron coincide con un jugador que ya existe, aprobar
          // desde acá crearía un duplicado. Esa decisión se toma en el torneo, que es
          // donde se puede elegir cuál de los candidatos es.
          const hayDuplicado = (solicitud.jugador1EsNuevo && (solicitud.jugador1Candidatos?.length ?? 0) > 0)
            || (solicitud.jugador2EsNuevo && (solicitud.jugador2Candidatos?.length ?? 0) > 0)
          return (
            <li key={solicitud.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rp-border bg-rp-bg/55 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-rp-text">{solicitud.jugador1} / {solicitud.jugador2}</p>
                <p className="text-xs text-rp-muted">
                  {solicitud.categoriaNombre}
                  {solicitud.telefonoContacto ? ` · ${solicitud.telefonoContacto}` : ''}
                  {solicitud.pagada ? ' · seña paga' : ''}
                </p>
                {hayDuplicado && (
                  <p className="mt-1 text-xs font-bold text-rp-amber">
                    Un nombre coincide con un jugador que ya existe: resolvelo en el torneo antes de aprobar.
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {hayDuplicado ? (
                  solicitud.torneoId && (
                    <Button size="sm" variant="subtle" asChild onClick={() => setDetalle(null)}>
                      <NavLink to={`/admin/torneos/${solicitud.torneoId}`}><ClipboardList size={15} />Resolver</NavLink>
                    </Button>
                  )
                ) : (
                  <Button size="sm" disabled={accionando === solicitud.id} onClick={() => resolverInscripcion(solicitud, 'aprobar')}>Confirmar</Button>
                )}
                <Button size="sm" variant="ghost" disabled={accionando === solicitud.id} onClick={() => resolverInscripcion(solicitud, 'rechazar')}>Rechazar</Button>
              </div>
            </li>
          )
        }}
      />

      {/* Mientras se carga un turno, la lista se esconde en vez de quedar detrás: dos
          modales apilados se cierran los dos de un solo Escape. La lista vuelve —ya
          recargada— apenas se cierra el formulario. */}
      <Modal isOpen={detalle === 'disponibles' && !slotNuevo} onClose={() => setDetalle(null)} title="Turnos que todavía podés vender" size="md">
        {(panel?.disponiblesPorDuracion ?? []).length > 0 && (
          <div className="mb-3 rounded-md border border-rp-border bg-rp-bg/55 p-3">
            <p className="text-xs font-bold text-rp-muted">Con lo que queda libre en toda la sede podés vender:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {panel!.disponiblesPorDuracion.map((fila) => (
                <span key={fila.minutos} className="rounded-md border border-rp-accent/50 bg-rp-accent/10 px-2 py-1 text-sm font-bold text-rp-text">
                  {fila.turnos} de {duracionCorta(fila.minutos)}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-rp-muted">Es el mismo hueco contado de distintas formas, no se suman.</p>
          </div>
        )}
        {cargandoDisponibles ? (
          <p className="py-6 text-center text-sm text-rp-muted">Cargando disponibilidad...</p>
        ) : disponibles.length === 0 ? (
          <p className="py-6 text-center text-sm text-rp-muted">Esta sede no tiene canchas.</p>
        ) : (
          (() => {
            const grupo = disponibles[Math.min(indiceGrupo, disponibles.length - 1)]
            return (
              <div className="flex flex-col gap-3">
                <NavegadorFase
                  etiqueta={grupo.etiqueta}
                  indice={Math.min(indiceGrupo, disponibles.length - 1)}
                  total={disponibles.length}
                  onAnterior={() => setIndiceGrupo((i) => (i - 1 + disponibles.length) % disponibles.length)}
                  onSiguiente={() => setIndiceGrupo((i) => (i + 1) % disponibles.length)}
                />
                {grupo.slots.length === 0 ? (
                  <p className="py-4 text-center text-sm text-rp-muted">Esta cancha ya no tiene horarios libres en la jornada.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {grupo.slots.map((slot) => (
                      <li key={slot.horaInicio} className="flex flex-wrap items-center gap-2 rounded-md border border-rp-border bg-rp-bg/55 px-3 py-2">
                        <span className="font-mono text-sm font-black text-rp-accent">{hora(slot.horaInicio)}</span>
                        <span className="flex flex-1 flex-wrap gap-1.5">
                          {slot.opciones.map((opcion) => (
                            <span key={opcion.minutos} className="rounded border border-rp-border px-1.5 py-0.5 text-xs font-bold text-rp-text">
                              {duracionCorta(opcion.minutos)}
                              {opcion.precio != null ? <span className="ml-1 font-normal text-rp-muted">{formatearMoneda(opcion.precio)}</span> : null}
                            </span>
                          ))}
                        </span>
                        <Button size="sm" variant="subtle" onClick={() => abrirTurnoManual(grupo, slot)}>
                          <Plus size={15} />Cargar
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })()
        )}
      </Modal>

      <Modal isOpen={detalle === 'reponer'} onClose={() => setDetalle(null)} title="Productos bajo el stock mínimo" size="md">
        {bajoMinimo.length === 0 ? (
          <p className="py-6 text-center text-sm text-rp-muted">Todos los productos están por encima de su mínimo.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rp-border text-left text-[10px] font-black uppercase tracking-[0.12em] text-rp-muted">
                    <th className="pb-2">Producto</th>
                    <th className="pb-2 text-right">Quedan</th>
                    <th className="pb-2 text-right">Mínimo</th>
                    <th className="pb-2 text-right">Faltan</th>
                  </tr>
                </thead>
                <tbody>
                  {bajoMinimo
                    .slice((paginaProductos - 1) * PRODUCTOS_POR_PAGINA, paginaProductos * PRODUCTOS_POR_PAGINA)
                    .map((producto) => (
                      <tr key={producto.id} className="border-b border-rp-border/60 last:border-0">
                        <td className="py-2 pr-2 font-bold text-rp-text">{producto.nombre}</td>
                        <td className={`py-2 text-right font-black ${producto.stock <= 0 ? 'text-rp-danger' : 'text-rp-text'}`}>{producto.stock}</td>
                        <td className="py-2 text-right text-rp-muted">{producto.stockMinimo}</td>
                        <td className="py-2 text-right font-bold text-rp-amber">{Math.max(0, producto.stockMinimo - producto.stock)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <Pagination page={paginaProductos} pageSize={PRODUCTOS_POR_PAGINA} total={bajoMinimo.length} onPageChange={setPaginaProductos} />
            <Button variant="subtle" size="sm" asChild className="mt-3" onClick={() => setDetalle(null)}>
              <NavLink to="/admin/productos"><Package size={15} />Cargar mercadería</NavLink>
            </Button>
          </>
        )}
      </Modal>

      {/* ---------- Acciones ---------- */}

      <VentaRapidaModal
        abierto={turnoVenta !== null}
        onClose={() => setTurnoVenta(null)}
        onVendido={recargar}
        turno={turnoVenta && {
          id: turnoVenta.id,
          clienteNombre: turnoVenta.clienteNombre,
          horario: hora(turnoVenta.horaInicio),
        }}
      />
      <VentaRapidaModal abierto={ventaSuelta} onClose={() => setVentaSuelta(false)} onVendido={recargar} />

      <Modal
        isOpen={Boolean(slotNuevo)}
        onClose={() => setSlotNuevo(null)}
        onSubmit={guardarTurnoManual}
        title="Cargar un turno"
        size="sm"
      >
        {slotNuevo && (
          <div className="flex flex-col gap-4">
            <p className="rounded-md border border-rp-accent/40 bg-rp-accent/10 px-3 py-2 text-sm text-rp-text">
              <b>{slotNuevo.canchaNombre}</b> a las <b>{hora(slotNuevo.horaInicio)}</b> hs, {formatearFechaLarga(panel?.fechaJornada)}.
            </p>
            <Input label="Cliente" value={formNuevo.nombre} onChange={(e) => setFormNuevo((f) => ({ ...f, nombre: e.target.value }))} placeholder="Nombre y apellido" />
            <Input label="Teléfono" value={formNuevo.telefono} onChange={(e) => setFormNuevo((f) => ({ ...f, telefono: e.target.value }))} placeholder="3855123456" />
            <Select label="Duración" value={String(formNuevo.duracion)} onChange={(e) => setFormNuevo((f) => ({ ...f, duracion: Number(e.target.value) }))}>
              {slotNuevo.opciones.map((opcion) => (
                <option key={opcion.minutos} value={opcion.minutos}>
                  {duracionCorta(opcion.minutos)}
                  {opcion.precio != null ? ` - ${formatearMoneda(opcion.precio)}` : ''}
                </option>
              ))}
            </Select>
            {errorNuevo && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorNuevo}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setSlotNuevo(null)} disabled={guardandoNuevo}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={guardandoNuevo}>{guardandoNuevo ? 'Cargando...' : 'Cargar turno'}</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={Boolean(turnoCobro)} onClose={() => setTurnoCobro(null)} onSubmit={cobrar} title="Cobrar la cuenta" size="sm">
        {turnoCobro && (
          <div className="flex flex-col gap-4">
            <div className="rounded-md border border-rp-border bg-rp-surface-2 px-3 py-2 text-sm">
              <p className="font-bold text-rp-text">{turnoCobro.clienteNombre}</p>
              <p className="text-xs text-rp-muted">
                {turnoCobro.canchaNombre} · {hora(turnoCobro.horaInicio)} a {hora(turnoCobro.horaFin)} hs
              </p>
              <div className="mt-2 flex flex-col gap-0.5 border-t border-rp-border pt-2 text-xs">
                <span className="flex justify-between"><span className="text-rp-muted">Cancha</span><span className="text-rp-text">{formatearMoneda(turnoCobro.precioAplicado ?? 0)}</span></span>
                {(turnoCobro.consumoACuenta ?? 0) > 0 && (
                  <span className="flex justify-between"><span className="text-rp-muted">Consumo</span><span className="text-rp-text">{formatearMoneda(turnoCobro.consumoACuenta ?? 0)}</span></span>
                )}
                {(turnoCobro.seniaPagada ?? 0) > 0 && (
                  <span className="flex justify-between"><span className="text-rp-muted">Seña ya pagada</span><span className="text-rp-text">-{formatearMoneda(turnoCobro.seniaPagada ?? 0)}</span></span>
                )}
                {(turnoCobro.totalCobrado ?? 0) > 0 && (
                  <span className="flex justify-between"><span className="text-rp-muted">Ya cobrado</span><span className="text-rp-text">-{formatearMoneda(turnoCobro.totalCobrado ?? 0)}</span></span>
                )}
                <span className="mt-1 flex justify-between border-t border-rp-border pt-1 text-sm font-black">
                  <span className="text-rp-muted">A cobrar</span>
                  <span className="text-rp-accent">{formatearMoneda(turnoCobro.saldoPendiente ?? 0)}</span>
                </span>
              </div>
            </div>
            <Input label="Monto" value={formCobro.monto} onChange={(e) => setFormCobro((f) => ({ ...f, monto: e.target.value }))} />
            <Select label="Cómo paga" value={formCobro.medio} onChange={(e) => setFormCobro((f) => ({ ...f, medio: e.target.value as MedioPago }))}>
              {MEDIOS.map((medio) => <option key={medio.valor} value={medio.valor}>{medio.nombre}</option>)}
            </Select>
            {errorCobro && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorCobro}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setTurnoCobro(null)} disabled={cobrando}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={cobrando}>{cobrando ? 'Registrando...' : 'Cobrar'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  )
}

/**
 * "5 de 1 h · 2 de 2 h". Las cantidades no se suman entre sí: es el mismo hueco contado
 * con cada duración que el club vende.
 */
function desgloseDisponibles(duraciones: AdminDashboardResponse['disponiblesPorDuracion'] | undefined) {
  const conTurnos = (duraciones ?? []).filter((fila) => fila.turnos > 0)
  if (conTurnos.length === 0) return undefined
  return conTurnos.map((fila) => `${fila.turnos} de ${duracionCorta(fila.minutos)}`).join(' · ')
}

function Tarjeta({ icono: Icono, titulo, valor, detalle, tono = 'normal', onClick }: {
  icono: typeof Wallet
  titulo: string
  valor: string
  detalle: string
  tono?: 'normal' | 'alerta'
  onClick?: () => void
}) {
  const fondo = tono === 'alerta' ? 'border-rp-amber/40 bg-rp-amber/10' : 'border-rp-border bg-rp-surface/82'
  const contenido = (
    <>
      <div className="flex items-start justify-between">
        <Icono size={18} className="text-rp-accent" />
        {onClick && <span className="text-[11px] font-bold text-rp-muted transition group-hover:text-rp-accent">Ver →</span>}
      </div>
      <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-rp-muted">{titulo}</p>
      <p className="mt-1 text-2xl font-black text-rp-text">{valor}</p>
      <p className="mt-0.5 truncate text-xs text-rp-muted" title={detalle}>{detalle}</p>
    </>
  )
  if (!onClick) return <article className={`rounded-lg border p-4 ${fondo}`}>{contenido}</article>
  return (
    <button type="button" onClick={onClick} className={`group cursor-pointer rounded-lg border p-4 text-left transition hover:border-rp-accent/60 ${fondo}`}>
      {contenido}
    </button>
  )
}

/**
 * Modal que muestra un grupo por vez —una cancha, un torneo— y se recorre con las
 * flechas. Es el patrón que ya usa el resto del panel para no apilar listas largas.
 */
function ModalPorGrupo<T>({ abierto, onClose, titulo, vacio, grupos, indice, onIndice, render }: {
  abierto: boolean
  onClose: () => void
  titulo: string
  vacio: string
  grupos: { etiqueta: string; elementos: T[] }[]
  indice: number
  onIndice: (actualizar: (i: number) => number) => void
  render: (item: T) => React.ReactNode
}) {
  const actual = grupos.length > 0 ? grupos[Math.min(indice, grupos.length - 1)] : undefined
  return (
    <Modal isOpen={abierto} onClose={onClose} title={titulo} size="md">
      {!actual ? (
        <p className="py-6 text-center text-sm text-rp-muted">{vacio}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <NavegadorFase
            etiqueta={actual.etiqueta}
            indice={Math.min(indice, grupos.length - 1)}
            total={grupos.length}
            onAnterior={() => onIndice((i) => (i - 1 + grupos.length) % grupos.length)}
            onSiguiente={() => onIndice((i) => (i + 1) % grupos.length)}
          />
          <ul className="flex flex-col gap-2">{actual.elementos.map(render)}</ul>
        </div>
      )}
    </Modal>
  )
}

function Bloque({ titulo, vacio, children }: { titulo: string; vacio?: string; children: React.ReactNode }) {
  const hayContenido = Array.isArray(children) ? children.length > 0 : Boolean(children)
  if (!hayContenido && !vacio) return null
  return (
    <div className="mt-5">
      <h2 className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-rp-accent">{titulo}</h2>
      {hayContenido
        ? <div className="flex flex-col gap-2">{children}</div>
        : <p className="rounded-lg border border-rp-border bg-rp-surface/82 px-4 py-3 text-sm text-rp-muted">{vacio}</p>}
    </div>
  )
}

function FilaTurno({ turno, onConsumo, onCobrar }: {
  turno: ReservaResponse
  onConsumo: () => void
  onCobrar: () => void
}) {
  const saldo = turno.saldoPendiente ?? 0
  const consumo = turno.consumoACuenta ?? 0
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rp-border bg-rp-surface/82 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-rp-text">
          {hora(turno.horaInicio)} - {hora(turno.horaFin)}
          <span className="ml-2 font-bold text-rp-muted">{turno.canchaNombre}</span>
        </p>
        <p className="truncate text-sm text-rp-text">{turno.clienteNombre}</p>
        <p className="text-xs text-rp-muted">
          Cancha {formatearMoneda(turno.precioAplicado ?? 0)}
          {consumo > 0 ? ` + consumo ${formatearMoneda(consumo)}` : ''}
        </p>
      </div>
      {/* Sin `shrink-0`: el saldo más los dos botones miden más que el ancho de un celular,
          y fijando el tamaño se salían de la pantalla en vez de partirse en dos líneas. */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {saldo > 0
          ? <span className="text-sm font-black text-rp-danger">Debe {formatearMoneda(saldo)}</span>
          : <span className="text-sm font-bold text-rp-accent">Pagado</span>}
        <Button size="sm" variant="subtle" onClick={onConsumo}><ShoppingCart size={15} />Consumo</Button>
        {saldo > 0 && <Button size="sm" onClick={onCobrar}><Wallet size={15} />Cobrar</Button>}
      </div>
    </div>
  )
}
