import { CalendarClock, Check, ChevronLeft, ChevronRight, MapPin, MessageCircle, Plus, Settings, ShoppingCart, Tag, Undo2, UserX, Wallet, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'

import { authApi } from '@/features/auth/authApi'
import { brand } from '@/config/brand'
import { cajaApi, MEDIOS, type MedioPago } from '@/features/caja/cajaApi'
import { canchasApi, placesApi } from '@/features/catalog/catalogApi'
import { horariosCanchaApi, reservasApi, type HorarioCanchaRequest, type ReservaResponse, type SlotDisponibilidad } from '@/features/reservas/reservasApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { fechaISO, formatearEnum, formatearFecha, formatearMoneda } from '@/shared/lib/formatters'
import { porNombreDeCancha } from '@/shared/lib/canchas'
import { compararPorJornada } from '@/shared/lib/jornada'
import { enlaceWhatsApp, mensajeRecordatorioTurno } from '@/shared/lib/whatsapp'
import { TelefonoWhatsApp } from '@/shared/ui/TelefonoWhatsApp'
import type { CanchaResponse, LugarResponse } from '@/shared/types/api'
import { AdminPageHeader } from '@/shared/ui/AdminPageHeader'
import { AdminTable, type Column } from '@/shared/ui/AdminTable'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { NavegadorFase } from '@/shared/ui/NavegadorFase'
import { SegmentedToggle } from '@/shared/ui/SegmentedToggle'
import { Select } from '@/shared/ui/Select'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { PromocionesCanchaModal } from '@/pages/admin/PromocionesCanchaModal'
import { VentaRapidaModal } from '@/pages/admin/VentaRapidaModal'
import { useToast } from '@/shared/ui/Toast'

const NOMBRES_DIA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

type FilaReserva = {
  id: number
  reservas: ReservaResponse[]
  horaInicio: string
  horaFin: string
  duracionMin: number
  clienteNombre: string
  clienteTelefono: string
  estado: string | null
  estadoPago: string | null
  codigo: string
  turnoFijo: boolean
  saldoPendiente: number
  consumoACuenta: number
}

function toneReserva(estado: string | null): 'success' | 'neutral' | 'danger' | 'warning' {
  switch (estado) {
    case 'CONFIRMADA': return 'success'
    case 'FINALIZADA': return 'warning'
    case 'RECHAZADA':
    case 'CANCELADA':
    case 'NO_SHOW':
    case 'EXPIRADA': return 'danger'
    default: return 'neutral'
  }
}

/** Un turno solo se puede marcar como ausente una vez que empezó. */
function yaEmpezo(fecha: string, horaInicio: string) {
  return new Date(`${fecha}T${horaInicio}`) <= new Date()
}

const aISO = fechaISO

function lunesDeLaSemana(base: Date) {
  const dia = new Date(base)
  dia.setDate(dia.getDate() - ((dia.getDay() + 6) % 7))
  dia.setHours(0, 0, 0, 0)
  return dia
}

function hhmm(hora: string) {
  return hora.slice(0, 5)
}

const HORARIO_VACIO: HorarioCanchaRequest = {
  canchaId: 0,
  horaApertura: '18:00',
  horaCierre: '23:00',
  diasActivos: '1,2,3,4,5,6,7',
  duracionesOfrecidas: '60,120',
  anticipacionDias: 14,
}


function etiquetaDuracion(minutos: number) {
  return minutos % 60 === 0 ? `${minutos / 60} h` : `${minutos} min`
}

export default function TurnosAdminPage() {
  const [lugares, setLugares] = useState<LugarResponse[]>([])
  const [canchas, setCanchas] = useState<CanchaResponse[]>([])
  const [lugarId, setLugarId] = useState<number | null>(null)
  const [canchaId, setCanchaId] = useState<number | null>(null)
  const [inicioSemana, setInicioSemana] = useState(() => lunesDeLaSemana(new Date()))
  const [fecha, setFecha] = useState(aISO(new Date()))
  const [reservas, setReservas] = useState<ReservaResponse[]>([])
  const [filtroEstado, setFiltroEstado] = useState(() => sessionStorage.getItem('rp-turnos-admin-estado') ?? 'CONFIRMADA')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Número del último pedido de agenda disparado, para ignorar las respuestas viejas. */
  const ultimoPedido = useRef(0)
  const { success: avisoExito } = useToast()

  /**
   * Solo de lectura: el horario se edita en Configuración → Turnos. Acá se necesita la
   * hora de apertura, que es la que define el orden de la jornada.
   */
  const [horario, setHorario] = useState<HorarioCanchaRequest>(HORARIO_VACIO)

  const [promocionesAbiertas, setPromocionesAbiertas] = useState(false)
  const [filaConsumo, setFilaConsumo] = useState<FilaReserva | null>(null)
  const [filaCobro, setFilaCobro] = useState<FilaReserva | null>(null)
  const [formCobro, setFormCobro] = useState<{ monto: string; medio: MedioPago; notas: string }>({ monto: '', medio: 'EFECTIVO', notas: '' })
  const [cobrando, setCobrando] = useState(false)
  const [errorCobro, setErrorCobro] = useState<string | null>(null)

  const [nuevoAbierto, setNuevoAbierto] = useState(false)
  const [slotsNuevo, setSlotsNuevo] = useState<SlotDisponibilidad[]>([])
  const [horarioNuevo, setHorarioNuevo] = useState('')
  const [duracionNuevo, setDuracionNuevo] = useState(60)
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [telefonoNuevo, setTelefonoNuevo] = useState('')
  const [guardandoNuevo, setGuardandoNuevo] = useState(false)
  const [errorNuevo, setErrorNuevo] = useState<string | null>(null)

  /** Duraciones que entran a partir del horario elegido, ya cotizadas por el backend. */
  const opcionesNuevo = useMemo(
    () => slotsNuevo.find((slot) => slot.horaInicio === horarioNuevo)?.opciones ?? [],
    [slotsNuevo, horarioNuevo],
  )

  useEffect(() => {
    Promise.all([placesApi.getAll(), canchasApi.getAll()])
      .then(([lugaresData, canchasData]) => {
        setLugares(lugaresData)
        setCanchas(canchasData)
        const lugarGuardado = Number(sessionStorage.getItem('rp-turnos-admin-lugar'))
        const canchaGuardada = Number(sessionStorage.getItem('rp-turnos-admin-cancha'))
        const lugarInicial = lugaresData.some((l) => l.id === lugarGuardado)
          ? lugarGuardado
          : lugaresData.find((l) => canchasData.some((c) => c.lugarId === l.id))?.id ?? lugaresData[0]?.id ?? null
        setLugarId(lugarInicial)
        const delLugar = canchasData.filter((c) => c.lugarId === lugarInicial).sort(porNombreDeCancha((cancha) => cancha.nombre))
        const canchaValida = delLugar.find((c) => c.id === canchaGuardada)
        setCanchaId((canchaValida ?? delLugar[0])?.id ?? null)
      })
      .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
  }, [])

  useEffect(() => {
    if (lugarId != null) sessionStorage.setItem('rp-turnos-admin-lugar', String(lugarId))
  }, [lugarId])

  useEffect(() => {
    if (canchaId != null) sessionStorage.setItem('rp-turnos-admin-cancha', String(canchaId))
  }, [canchaId])

  useEffect(() => {
    sessionStorage.setItem('rp-turnos-admin-estado', filtroEstado)
  }, [filtroEstado])

  // Ordenadas con el comparador compartido: sin él el backend devuelve "Cancha 10" antes
  // que "Cancha 2", y con flechas eso se nota más que en un select.
  const canchasDelLugar = useMemo(
    () => canchas.filter((c) => c.lugarId === lugarId).sort(porNombreDeCancha((cancha) => cancha.nombre)),
    [canchas, lugarId],
  )
  const indiceCancha = useMemo(
    () => Math.max(0, canchasDelLugar.findIndex((cancha) => cancha.id === canchaId)),
    [canchasDelLugar, canchaId],
  )
  const canchaActual = canchasDelLugar[indiceCancha] ?? null

  /** Da la vuelta en los extremos: de la última a la primera y al revés. */
  function moverCancha(paso: number) {
    if (canchasDelLugar.length === 0) return
    const total = canchasDelLugar.length
    const siguiente = (indiceCancha + paso + total) % total
    setCanchaId(canchasDelLugar[siguiente].id)
  }

  /**
   * Abre WhatsApp con el recordatorio ya escrito. El sistema no manda nada solo: el club
   * lee el mensaje y aprieta enviar, que además es lo que WhatsApp permite sin API paga.
   */
  function recordarPorWhatsApp(fila: FilaReserva) {
    const enlace = enlaceWhatsApp(fila.clienteTelefono, mensajeRecordatorioTurno({
      club: brand.name,
      clienteNombre: fila.clienteNombre,
      canchaNombre: canchasDelLugar.find((cancha) => cancha.id === canchaId)?.nombre ?? null,
      fecha,
      horaInicio: fila.horaInicio,
      saldoPendiente: fila.saldoPendiente,
    }))
    if (!enlace) {
      setError(`No se puede armar el WhatsApp: el teléfono "${fila.clienteTelefono}" no parece válido.`)
      return
    }
    window.open(enlace, '_blank', 'noopener')
  }
  const reservasFiltradas = useMemo(
    () => (filtroEstado ? reservas.filter((r) => r.estado === filtroEstado) : reservas),
    [reservas, filtroEstado],
  )
  /** Los turnos se ordenan por jornada: el de la 1 AM cierra la noche, no la abre. */
  const porJornada = useMemo(() => compararPorJornada(horario.horaApertura), [horario.horaApertura])
  /**
   * Un turno es una reserva y punto. Antes había que adivinar el lote juntando reservas
   * contiguas del mismo teléfono, porque un turno de dos horas eran dos filas de una.
   */
  const filasReservas = useMemo(
    () => [...reservasFiltradas]
      .map((reserva) => ({
        id: reserva.id,
        reservas: [reserva],
        horaInicio: reserva.horaInicio,
        horaFin: reserva.horaFin,
        duracionMin: reserva.duracionMin,
        clienteNombre: reserva.clienteNombre,
        clienteTelefono: reserva.clienteTelefono,
        estado: reserva.estado,
        estadoPago: reserva.estadoPago ?? null,
        codigo: reserva.codigo,
        turnoFijo: reserva.turnoFijo ?? false,
        saldoPendiente: reserva.saldoPendiente ?? 0,
        consumoACuenta: reserva.consumoACuenta ?? 0,
      }))
      .sort((a, b) => porJornada(a.horaInicio, b.horaInicio)
        || a.clienteNombre.localeCompare(b.clienteNombre, 'es', { sensitivity: 'base' })),
    [reservasFiltradas, porJornada],
  )

  /** Cuántos turnos hay en cada estado, para que el filtro muestre lo que va a filtrar. */
  const conteoPorEstado = useMemo(() => {
    const conteo: Record<string, number> = {}
    reservas.forEach((reserva) => {
      if (reserva.estado) conteo[reserva.estado] = (conteo[reserva.estado] ?? 0) + 1
    })
    return conteo
  }, [reservas])

  function elegirLugar(nuevoLugarId: number | null) {
    setLugarId(nuevoLugarId)
    setCanchaId(canchas.find((c) => c.lugarId === nuevoLugarId)?.id ?? null)
  }

  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicioSemana)
    d.setDate(d.getDate() + i)
    return d
  }), [inicioSemana])

  function cargarReservas(idCancha: number, dia: string) {
    setCargando(true)
    const pedido = ++ultimoPedido.current
    reservasApi.listar(idCancha, dia)
      .then((datos) => {
        // Se descarta la respuesta vieja: pasando de cancha en cancha con las flechas se
        // disparan varias consultas seguidas, y sin esto la que llega tarde pinta la
        // agenda de una cancha que ya no es la que está en pantalla.
        if (pedido !== ultimoPedido.current) return
        // Sin ordenar acá: el orden de la pantalla lo arma `filasReservas`, por jornada.
        setReservas(datos)
        setError(null)
      })
      .catch((e: unknown) => {
        if (pedido !== ultimoPedido.current) return
        setError(obtenerMensajeErrorApi(e))
      })
      .finally(() => {
        if (pedido === ultimoPedido.current) setCargando(false)
      })
  }

  useEffect(() => {
    if (canchaId == null) return
    cargarReservas(canchaId, fecha)
  }, [canchaId, fecha])

  /**
   * La agenda abre en la jornada que el club está atendiendo, no en el día de calendario:
   * a las 00:30 "hoy" todavía no arrancó y la pantalla salía vacía justo en el horario en
   * que el mostrador más la mira. Si la consulta falla queda el día de hoy, que es lo que
   * había antes: no vale dejar la pantalla sin agenda por esto.
   */
  useEffect(() => {
    let vigente = true
    reservasApi.jornadaActual()
      .then((jornada) => {
        if (!vigente || jornada === aISO(new Date())) return
        setFecha(jornada)
        setInicioSemana(lunesDeLaSemana(new Date(`${jornada}T00:00:00`)))
      })
      .catch(() => undefined)
    return () => { vigente = false }
  }, [])

  async function ejecutarAccionLote(reservasLote: ReservaResponse[], accion: (id: number) => Promise<unknown>, mensaje: string) {
    if (canchaId == null) return
    try {
      await Promise.all(reservasLote.map((reserva) => accion(reserva.id)))
      avisoExito(mensaje)
      cargarReservas(canchaId, fecha)
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    }
  }

  function abrirCobro(fila: FilaReserva) {
    setFilaCobro(fila)
    setFormCobro({ monto: String(fila.saldoPendiente), medio: 'EFECTIVO', notas: '' })
    setErrorCobro(null)
  }

  /**
   * Un turno de dos horas son dos reservas pero un solo cobro para el cliente: el monto
   * se reparte entre los horarios que todavía deben, hasta agotarlo.
   */
  async function cobrar() {
    if (!filaCobro || canchaId == null) return
    const monto = Number(formCobro.monto.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'))
    if (!Number.isFinite(monto) || monto <= 0) { setErrorCobro('Ingresá un monto válido.'); return }
    if (monto > filaCobro.saldoPendiente) { setErrorCobro(`El monto supera el saldo pendiente (${formatearMoneda(filaCobro.saldoPendiente)}).`); return }

    setCobrando(true); setErrorCobro(null)
    try {
      let restante = monto
      for (const reserva of filaCobro.reservas) {
        const saldo = reserva.saldoPendiente ?? 0
        if (saldo <= 0 || restante <= 0) continue
        const aCobrar = Math.min(restante, saldo)
        await cajaApi.cobrar(reserva.id, {
          monto: aCobrar,
          medio: formCobro.medio,
          notas: formCobro.notas.trim() || null,
        })
        restante -= aCobrar
      }
      setFilaCobro(null)
      avisoExito('Cobro registrado')
      cargarReservas(canchaId, fecha)
    } catch (e: unknown) {
      setErrorCobro(obtenerMensajeErrorApi(e))
    } finally { setCobrando(false) }
  }

  /**
   * El horario se carga apenas se elige la cancha, no recién al abrir el modal: la hora
   * de apertura es la que define el orden de la jornada, y sin ella los turnos de la
   * madrugada se ordenaban arriba de todo en vez de al final de la noche.
   */
  useEffect(() => {
    if (canchaId == null) return
    const idCancha = canchaId
    horariosCanchaApi.listar(idCancha)
      .then((lista) => {
        const activo = lista.find((h) => h.activo) ?? lista[0]
        setHorario(activo
          ? {
              canchaId: idCancha,
              horaApertura: hhmm(activo.horaApertura),
              horaCierre: hhmm(activo.horaCierre),
              diasActivos: activo.diasActivos ?? '1,2,3,4,5,6,7',
              duracionesOfrecidas: activo.duracionesOfrecidas,
              anticipacionDias: activo.anticipacionDias,
            }
          : { ...HORARIO_VACIO, canchaId: idCancha })
      })
      .catch(() => setHorario({ ...HORARIO_VACIO, canchaId: idCancha }))
  }, [canchaId])

  function abrirNuevo() {
    if (canchaId == null) return
    setNombreNuevo('')
    setTelefonoNuevo('')
    setHorarioNuevo('')
    setDuracionNuevo(60)
    setErrorNuevo(null)
    setSlotsNuevo([])
    setNuevoAbierto(true)
    reservasApi.getDisponibilidad(canchaId, fecha)
      .then((datos) => setSlotsNuevo(datos.filter((slot) => slot.disponible)))
      .catch((e: unknown) => setErrorNuevo(obtenerMensajeErrorApi(e)))
  }

  async function guardarNuevo() {
    if (canchaId == null) return
    if (!nombreNuevo.trim() || !telefonoNuevo.trim() || !horarioNuevo) {
      setErrorNuevo('Completá cliente, teléfono y horario.')
      return
    }
    setGuardandoNuevo(true)
    setErrorNuevo(null)
    try {
      const reserva = await reservasApi.solicitar({
        canchaId,
        fecha,
        horaInicio: horarioNuevo,
        duracionMin: duracionNuevo,
        clienteNombre: nombreNuevo.trim(),
        clienteTelefono: telefonoNuevo.trim(),
      })
      // El club carga el turno de frente al mostrador: no hay nada que aprobar después.
      await reservasApi.confirmar(reserva.id)
      avisoExito('Turno asignado')
      setNuevoAbierto(false)
      cargarReservas(canchaId, fecha)
    } catch (e: unknown) {
      setErrorNuevo(obtenerMensajeErrorApi(e))
    } finally {
      setGuardandoNuevo(false)
    }
  }

  const columnas = useMemo(() => [
    {
      key: 'horario',
      label: 'Horario',
      render: (fila: FilaReserva) => (
        <div>
          <p className="text-sm font-bold text-rp-text">{hhmm(fila.horaInicio)} - {hhmm(fila.horaFin)}</p>
          <p className="text-xs text-rp-muted">{etiquetaDuracion(fila.duracionMin)}</p>
        </div>
      ),
    },
    {
      key: 'cliente',
      label: 'Cliente',
      render: (fila: FilaReserva) => (
        <div>
          <p className="text-sm font-bold text-rp-text">{fila.clienteNombre}</p>
          <TelefonoWhatsApp
            telefono={fila.clienteTelefono}
            mensaje={`Hola ${fila.clienteNombre}! Te escribo por tu turno de las ${hhmm(fila.horaInicio)} (código ${fila.codigo}).`}
          />
        </div>
      ),
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (fila: FilaReserva) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge tone={toneReserva(fila.estado)}>{formatearEnum(fila.estado ?? '')}</StatusBadge>
          {fila.turnoFijo && (
            <span className="rounded-full bg-rp-surface-2 px-2 py-0.5 text-[10px] font-bold text-rp-muted" title="Viene de un turno fijo">Fijo</span>
          )}
        </div>
      ),
    },
    {
      key: 'pago',
      label: 'Pago',
      render: (fila: FilaReserva) => (
        fila.estadoPago === 'APROBADO'
          ? <span className="rounded-full bg-rp-accent/15 px-2 py-0.5 text-[10px] font-bold text-rp-accent">Seña pagada</span>
          : fila.estadoPago === 'APROBADO_SIN_TURNO'
            ? <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400" title="El pago entró después de que venciera el turno. Hay que devolverle la seña al cliente.">Devolver seña</span>
            : fila.estadoPago === 'PENDIENTE'
              ? <span className="text-xs text-rp-muted">Pago pendiente</span>
              : <span className="text-xs text-rp-muted">En el club</span>
      ),
    },
    {
      key: 'saldo',
      label: 'Cuenta',
      render: (fila: FilaReserva) => {
        if (fila.estado === 'PENDIENTE') {
          return <span className="text-xs text-rp-muted">Sin confirmar</span>
        }
        const cancha = fila.reservas.reduce((total, reserva) => total + (reserva.precioAplicado ?? 0), 0)
        return (
          <div>
            {fila.saldoPendiente > 0
              ? <span className="text-sm font-bold text-rp-danger">Debe {formatearMoneda(fila.saldoPendiente)}</span>
              : <span className="text-sm font-bold text-rp-accent">Pagado</span>}
            {/* La cuenta del turno: la cancha más lo que consumieron mientras jugaban. */}
            <p className="text-[11px] text-rp-muted">
              Cancha {formatearMoneda(cancha)}
              {fila.consumoACuenta > 0 ? ` + consumo ${formatearMoneda(fila.consumoACuenta)}` : ''}
            </p>
          </div>
        )
      },
    },
    { key: 'codigo', label: 'Código', render: (fila: FilaReserva) => <span className="text-xs text-rp-muted">{fila.codigo}</span> },
  ] as Column<FilaReserva>[], [])

  const hoy = aISO(new Date())

  return (
    <section>
      <AdminPageHeader title={<><CalendarClock size={26} />Turnos</>} action={<>
        <Button size="sm" onClick={abrirNuevo} disabled={canchaId == null}><Plus size={16} />Nuevo turno</Button>
        {/* El horario vive en Configuración: define qué se vende, igual que el precio, y
            por eso lo toca el dueño. Al empleado no se le ofrece un atajo a un 403. */}
        {authApi.esDuenio() && (
          <Button size="sm" variant="subtle" asChild>
            <NavLink to="/admin/configuracion"><Settings size={16} />Configurar horario</NavLink>
          </Button>
        )}
        <Button size="sm" variant="subtle" onClick={() => setPromocionesAbiertas(true)} disabled={canchaId == null}><Tag size={16} />Promociones</Button>
      </>} />

      <div className="mt-4 grid gap-3 sm:max-w-md sm:grid-cols-2">
        {/* La sucursal solo se elige si hay más de una: el club típico tiene una sola y
            un select de un ítem es una decisión que no existe. */}
        {lugares.length > 1 && (
          <Select label="Sucursal" value={lugarId ?? ''} onChange={(e) => elegirLugar(e.target.value ? Number(e.target.value) : null)}>
            {lugares.map((lugar) => <option key={lugar.id} value={lugar.id}>{lugar.nombre}</option>)}
          </Select>
        )}
        {/* Las canchas se recorren con flechas, no con un select: el mostrador pasa de una
            a la otra todo el tiempo y abrir una lista para cada cambio es un clic de más. */}
        <div>
          <span className="text-xs font-black uppercase tracking-[0.14em] text-rp-muted">Cancha</span>
          <div className="mt-2">
            {canchasDelLugar.length === 0
              ? <p className="rounded-lg border border-rp-border bg-rp-surface/82 px-3 py-3 text-sm text-rp-muted">Esta sucursal no tiene canchas cargadas.</p>
              : <NavegadorFase
                  nombreRecurso="Cancha"
                  etiqueta={canchaActual?.nombre ?? 'Sin canchas'}
                  indice={indiceCancha}
                  total={canchasDelLugar.length}
                  onAnterior={() => moverCancha(-1)}
                  onSiguiente={() => moverCancha(1)}
                />}
          </div>
        </div>
      </div>

      <div className="mt-3">
        <span className="text-xs font-black uppercase tracking-[0.14em] text-rp-muted">Estado</span>
        <SegmentedToggle
          className="mt-2"
          valor={filtroEstado}
          onChange={setFiltroEstado}
          opciones={[
            { valor: 'CONFIRMADA', label: 'Confirmados' },
            { valor: 'PENDIENTE', label: 'Pendientes' },
            { valor: 'FINALIZADA', label: 'Jugados' },
            { valor: 'NO_SHOW', label: 'No vinieron' },
            { valor: 'CANCELADA', label: 'Cancelados' },
            { valor: 'RECHAZADA', label: 'Rechazados' },
            { valor: 'EXPIRADA', label: 'Vencidos' },
            { valor: '', label: 'Todos' },
          ].map((opcion) => ({
            ...opcion,
            label: opcion.valor
              ? `${opcion.label} (${conteoPorEstado[opcion.valor] ?? 0})`
              : `${opcion.label} (${reservas.length})`,
          }))}
        />
      </div>

      <div className="mt-5">
        <span className="text-xs font-black uppercase tracking-[0.14em] text-rp-muted">Día</span>
        <div className="mt-2 flex max-w-2xl items-stretch gap-1.5">
          <button onClick={() => setInicioSemana((a) => { const n = new Date(a); n.setDate(n.getDate() - 7); return n })}
            disabled={inicioSemana.getTime() <= lunesDeLaSemana(new Date()).getTime()}
            className="flex shrink-0 items-center justify-center rounded-md border border-rp-border px-1.5 text-rp-muted disabled:opacity-40 hover:enabled:text-rp-accent" aria-label="Semana anterior"><ChevronLeft size={18} /></button>
          <div className="grid flex-1 grid-cols-7 gap-1.5">
            {dias.map((dia, i) => {
              const iso = aISO(dia)
              const sel = iso === fecha
              return (
                <button key={iso} onClick={() => setFecha(iso)}
                  aria-label={dia.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  aria-pressed={sel}
                  className={sel
                    ? 'flex flex-col items-center gap-0.5 rounded-md border border-rp-accent bg-rp-accent/20 px-1 py-2 text-rp-text'
                    : 'flex flex-col items-center gap-0.5 rounded-md border border-rp-border bg-rp-surface px-1 py-2 text-rp-muted hover:border-rp-accent'}>
                  <span className="text-[10px] font-black uppercase tracking-wide">{NOMBRES_DIA[i]}</span>
                  <span className="text-base font-black leading-none text-rp-text">{dia.getDate()}</span>
                  <span className="text-[9px] font-bold uppercase opacity-70">{dia.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')}{iso === hoy ? ' · hoy' : ''}</span>
                </button>
              )
            })}
          </div>
          <button onClick={() => setInicioSemana((a) => { const n = new Date(a); n.setDate(n.getDate() + 7); return n })}
            className="flex shrink-0 items-center justify-center rounded-md border border-rp-border px-1.5 text-rp-muted hover:text-rp-accent" aria-label="Semana siguiente"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-sm font-bold text-rp-muted">
        <MapPin size={15} className="text-rp-accent" />
        {lugares.find((l) => l.id === lugarId)?.nombre ?? 'Sucursal'}{canchasDelLugar.find((c) => c.id === canchaId) ? ` · ${canchasDelLugar.find((c) => c.id === canchaId)?.nombre}` : ''}
      </div>

      <div className="mt-3">
        <AdminTable
          columns={columnas}
          rows={filasReservas}
          getRowKey={(fila) => fila.id}
          isLoading={cargando}
          error={error}
          emptyTitle="No hay turnos para esta cancha y día"
          actions={(fila) => (
            <>
              {fila.estado === 'PENDIENTE' && (
                <button onClick={() => ejecutarAccionLote(fila.reservas, (id) => reservasApi.confirmar(id), fila.reservas.length > 1 ? 'Turnos confirmados' : 'Turno confirmado')} className="flex size-11 items-center justify-center rounded-md lg:size-8 text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent" aria-label="Confirmar"><Check size={15} /></button>
              )}
              {(fila.estado === 'PENDIENTE' || fila.estado === 'CONFIRMADA') && (
                <button onClick={() => ejecutarAccionLote(fila.reservas, (id) => fila.estado === 'PENDIENTE' ? reservasApi.rechazar(id) : reservasApi.cancelar(id), fila.reservas.length > 1 ? 'Turnos liberados' : 'Turno liberado')} className="flex size-11 items-center justify-center rounded-md lg:size-8 text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger" aria-label="Rechazar o cancelar"><X size={15} /></button>
              )}
              {(fila.estado === 'CONFIRMADA' || fila.estado === 'FINALIZADA') && yaEmpezo(fecha, fila.horaInicio) && (
                <button onClick={() => ejecutarAccionLote(fila.reservas, (id) => reservasApi.marcarNoShow(id), 'Marcado como ausente')} className="flex size-11 items-center justify-center rounded-md lg:size-8 text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger" aria-label="No vino" title="No vino"><UserX size={15} /></button>
              )}
              {(fila.estado === 'CONFIRMADA' || fila.estado === 'FINALIZADA' || fila.estado === 'NO_SHOW') && (
                <button onClick={() => setFilaConsumo(fila)} className="flex size-11 items-center justify-center rounded-md lg:size-8 text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent" aria-label="Cargar consumo" title="Cargar consumo al turno"><ShoppingCart size={15} /></button>
              )}
              {fila.saldoPendiente > 0 && fila.estado !== 'PENDIENTE' && (
                <button onClick={() => abrirCobro(fila)} className="flex size-11 items-center justify-center rounded-md lg:size-8 text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent" aria-label="Cobrar saldo" title="Cobrar la cuenta del turno"><Wallet size={15} /></button>
              )}
              {fila.estado === 'NO_SHOW' && (
                <button onClick={() => ejecutarAccionLote(fila.reservas, (id) => reservasApi.desmarcarNoShow(id), 'Ausencia deshecha')} className="flex size-11 items-center justify-center rounded-md lg:size-8 text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent" aria-label="Deshacer ausente" title="Deshacer: sí vino"><Undo2 size={15} /></button>
              )}
              {/* Recordar el turno es lo que baja los ausentes: cada uno es una hora de
                  cancha que ya no se puede revender. Solo tiene sentido antes de que
                  empiece y si el turno sigue en pie. */}
              {(fila.estado === 'PENDIENTE' || fila.estado === 'CONFIRMADA') && !yaEmpezo(fecha, fila.horaInicio) && (
                <button onClick={() => recordarPorWhatsApp(fila)} className="flex size-11 items-center justify-center rounded-md lg:size-8 text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent" aria-label="Recordar por WhatsApp" title="Recordarle el turno por WhatsApp"><MessageCircle size={15} /></button>
              )}
            </>
          )}
        />
      </div>

      <Modal isOpen={nuevoAbierto} onClose={() => setNuevoAbierto(false)} onSubmit={guardarNuevo} title="Asignar turno" size="sm">
        <div className="flex flex-col gap-4">
          <p className="text-xs text-rp-muted">{lugares.find((l) => l.id === lugarId)?.nombre} · {canchasDelLugar.find((c) => c.id === canchaId)?.nombre} · {formatearFecha(fecha)}</p>
          {slotsNuevo.length === 0 ? (
            <p className="text-sm text-rp-muted">No hay horarios libres para esta cancha en esta fecha.</p>
          ) : (
            <div>
              <span className="text-xs font-black uppercase tracking-[0.14em] text-rp-muted">Horario</span>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slotsNuevo.map((slot) => (
                  <button
                    key={slot.horaInicio}
                    type="button"
                    onClick={() => { setHorarioNuevo(slot.horaInicio); setDuracionNuevo(slot.opciones[0]?.minutos ?? 60) }}
                    className={horarioNuevo === slot.horaInicio
                      ? 'rounded-md border border-rp-accent bg-rp-accent px-2 py-1.5 text-sm font-black text-white'
                      : 'rounded-md border border-rp-accent/50 bg-rp-accent/10 px-2 py-1.5 text-sm font-bold text-rp-text hover:bg-rp-accent/20'}
                  >
                    {hhmm(slot.horaInicio)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {horarioNuevo && (
            <div>
              <span className="text-xs font-black uppercase tracking-[0.14em] text-rp-muted">Duración</span>
              <div className="mt-2 flex gap-2">
                {opcionesNuevo.map((opcion) => (
                  <button
                    key={opcion.minutos}
                    type="button"
                    onClick={() => setDuracionNuevo(opcion.minutos)}
                    className={duracionNuevo === opcion.minutos
                      ? 'flex-1 rounded-md border border-rp-accent bg-rp-accent px-3 py-2 text-white'
                      : 'flex-1 rounded-md border border-rp-border bg-rp-surface px-3 py-2 text-rp-text hover:border-rp-accent'}
                  >
                    <span className="block text-sm font-black">{etiquetaDuracion(opcion.minutos)}</span>
                    <span className="block text-xs font-semibold opacity-80">
                      {opcion.precio != null ? formatearMoneda(opcion.precio) : `hasta ${hhmm(opcion.horaFin)}`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <Input label="Cliente" value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} placeholder="Nombre del cliente" />
          <Input label="Teléfono" type="tel" value={telefonoNuevo} onChange={(e) => setTelefonoNuevo(e.target.value)} placeholder="385..." />
          {errorNuevo && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorNuevo}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setNuevoAbierto(false)} disabled={guardandoNuevo}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={guardandoNuevo || slotsNuevo.length === 0}>{guardandoNuevo ? 'Asignando...' : 'Asignar turno'}</Button>
          </div>
        </div>
      </Modal>

      <VentaRapidaModal
        abierto={filaConsumo !== null}
        onClose={() => setFilaConsumo(null)}
        onVendido={() => { if (canchaId != null) cargarReservas(canchaId, fecha) }}
        turno={filaConsumo && {
          id: filaConsumo.id,
          clienteNombre: filaConsumo.clienteNombre,
          horario: hhmm(filaConsumo.horaInicio),
        }}
      />

      <PromocionesCanchaModal
        canchaId={promocionesAbiertas ? canchaId : null}
        canchaNombre={canchasDelLugar.find((c) => c.id === canchaId)?.nombre ?? ''}
        precioBase={canchasDelLugar.find((c) => c.id === canchaId)?.precioPorHora ?? null}
        onClose={() => { setPromocionesAbiertas(false); if (canchaId != null) cargarReservas(canchaId, fecha) }}
      />

      <Modal isOpen={Boolean(filaCobro)} onClose={() => setFilaCobro(null)} onSubmit={cobrar} title="Cobrar saldo" size="sm">
        {filaCobro && (
          <div className="flex flex-col gap-4">
            <div className="rounded-md border border-rp-border bg-rp-surface-2 px-3 py-2 text-sm">
              <p className="font-bold text-rp-text">{filaCobro.clienteNombre}</p>
              <p className="text-xs text-rp-muted">
                {hhmm(filaCobro.horaInicio)} - {hhmm(filaCobro.horaFin)} · saldo {formatearMoneda(filaCobro.saldoPendiente)}
              </p>
            </div>
            <Input label="Monto" value={formCobro.monto} onChange={(e) => setFormCobro((f) => ({ ...f, monto: e.target.value }))} />
            <Select label="Cómo pagó" value={formCobro.medio} onChange={(e) => setFormCobro((f) => ({ ...f, medio: e.target.value as MedioPago }))}>
              {MEDIOS.map((medio) => <option key={medio.valor} value={medio.valor}>{medio.nombre}</option>)}
            </Select>
            <Input label="Notas" value={formCobro.notas} onChange={(e) => setFormCobro((f) => ({ ...f, notas: e.target.value }))} />
            {errorCobro && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorCobro}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setFilaCobro(null)} disabled={cobrando}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={cobrando}>{cobrando ? 'Registrando...' : 'Registrar cobro'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  )
}
