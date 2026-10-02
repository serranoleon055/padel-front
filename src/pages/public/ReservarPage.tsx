import { ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { brand } from '@/config/brand'
import { placesApi } from '@/features/catalog/catalogApi'
import { pagosApi } from '@/features/pagos/pagosApi'
import {
  reservasApi,
  type CanchaLibre, type FranjaSede, type OpcionDuracion, type ReservaResponse,
} from '@/features/reservas/reservasApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { fechaISO, formatearMoneda } from '@/shared/lib/formatters'
import type { LugarResponse } from '@/shared/types/api'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Select } from '@/shared/ui/Select'

const NOMBRES_DIA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const aISO = fechaISO

function hoyISO() {
  return aISO(new Date())
}

function lunesDeLaSemana(base: Date) {
  const dia = new Date(base)
  dia.setDate(dia.getDate() - ((dia.getDay() + 6) % 7))
  dia.setHours(0, 0, 0, 0)
  return dia
}

function hhmm(hora: string) {
  return hora.slice(0, 5)
}

function etiquetaDuracion(minutos: number) {
  return minutos % 60 === 0 ? `${minutos / 60} h` : `${minutos} min`
}

function enlaceWhatsApp(reserva: ReservaResponse) {
  const telefono = brand.phone.replace(/\D/g, '')
  const texto = `Hola! Quiero confirmar mi turno en ${reserva.canchaNombre} a nombre de ${reserva.clienteNombre}: `
    + `${reserva.fecha} de ${hhmm(reserva.horaInicio)} a ${hhmm(reserva.horaFin)} hs (código ${reserva.codigo}).`
  return `https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`
}

/** Lo que el jugador ya eligió: hora, cancha y duración. */
type Eleccion = { franja: FranjaSede; cancha: CanchaLibre; opcion: OpcionDuracion }

export default function ReservarPage() {
  const [lugares, setLugares] = useState<LugarResponse[]>([])
  const [lugarId, setLugarId] = useState<number | null>(null)

  const [inicioSemana, setInicioSemana] = useState(() => lunesDeLaSemana(new Date()))
  const [fecha, setFecha] = useState(hoyISO())
  const [franjas, setFranjas] = useState<FranjaSede[]>([])
  const [recarga, setRecarga] = useState(0)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // El flujo es en tres pasos: se elige el horario, después la cancha, después cuánto jugar.
  const [franjaAbierta, setFranjaAbierta] = useState<FranjaSede | null>(null)
  const [canchaElegida, setCanchaElegida] = useState<CanchaLibre | null>(null)
  const [eleccion, setEleccion] = useState<Eleccion | null>(null)

  const [metodoPago, setMetodoPago] = useState<'ONLINE' | 'EFECTIVO'>('EFECTIVO')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null)
  const [reservaCreada, setReservaCreada] = useState<ReservaResponse | null>(null)

  useEffect(() => {
    placesApi.getAll()
      .then((lugaresData) => {
        setLugares(lugaresData)
        const guardado = Number(sessionStorage.getItem('rp-turnos-lugar'))
        setLugarId(lugaresData.some((lugar) => lugar.id === guardado) ? guardado : lugaresData[0]?.id ?? null)
      })
      .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
  }, [])

  useEffect(() => {
    if (lugarId != null) sessionStorage.setItem('rp-turnos-lugar', String(lugarId))
  }, [lugarId])

  useEffect(() => {
    if (lugarId == null) return
    let activo = true
    setCargando(true)
    reservasApi.disponibilidadSede(lugarId, fecha)
      .then((datos) => { if (activo) { setFranjas(datos); setError(null) } })
      .catch((e: unknown) => { if (activo) setError(obtenerMensajeErrorApi(e)) })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [lugarId, fecha, recarga])

  useEffect(() => {
    const pendiente = sessionStorage.getItem('rp-pago-pendiente')
    if (!pendiente) return
    sessionStorage.removeItem('rp-pago-pendiente')
    pagosApi.obtenerPago(pendiente)
      .then((pago) => (pago.estado === 'APROBADO' ? null : pagosApi.cancelarPagoReserva(pendiente)))
      .catch(() => {})
      .finally(() => setRecarga((n) => n + 1))
  }, [])

  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const dia = new Date(inicioSemana)
    dia.setDate(dia.getDate() + i)
    return dia
  }), [inicioSemana])

  const hoy = hoyISO()
  const semanaActual = lunesDeLaSemana(new Date()).getTime()
  const lugarNombre = lugares.find((lugar) => lugar.id === lugarId)?.nombre ?? ''

  function cambiarSemana(deltaDias: number) {
    setInicioSemana((actual) => {
      const siguiente = new Date(actual)
      siguiente.setDate(siguiente.getDate() + deltaDias)
      return siguiente
    })
  }

  function elegirCancha(cancha: CanchaLibre) {
    setCanchaElegida(cancha)
    // Con una sola duración posible no tiene sentido preguntar.
    if (cancha.opciones.length === 1 && franjaAbierta) {
      abrirConfirmacion({ franja: franjaAbierta, cancha, opcion: cancha.opciones[0] })
    }
  }

  function abrirConfirmacion(elegido: Eleccion) {
    setEleccion(elegido)
    setFranjaAbierta(null)
    setCanchaElegida(null)
    setNombre('')
    setTelefono('')
    setEmail('')
    setErrorFormulario(null)
    setReservaCreada(null)
    setMetodoPago(elegido.opcion.precio != null ? 'ONLINE' : 'EFECTIVO')
  }

  function cerrarTodo() {
    setFranjaAbierta(null)
    setCanchaElegida(null)
    setEleccion(null)
    setErrorFormulario(null)
  }

  // El porcentaje lo define el club por cancha y lo manda el backend ya resuelto. Estaba
  // fijo en 50 acá: una cancha configurada al 30% anunciaba una seña y Mercado Pago
  // cobraba otra.
  const porcentajeSenia = eleccion?.cancha.seniaPorcentaje ?? 50
  const precio = eleccion?.opcion.precio ?? null
  const montoSenia = precio != null ? Math.round((precio * porcentajeSenia) / 100) : null
  const metodoEfectivo = precio == null || metodoPago === 'EFECTIVO'

  function datosDelPedido() {
    if (!eleccion) return null
    return {
      canchaId: eleccion.cancha.canchaId,
      fecha,
      horaInicio: eleccion.franja.horaInicio,
      duracionMin: eleccion.opcion.minutos,
      clienteNombre: nombre.trim(),
      clienteTelefono: telefono.trim(),
      clienteEmail: email.trim() || undefined,
    }
  }

  function faltanDatos() {
    if (!nombre.trim() || !telefono.trim()) {
      setErrorFormulario('Completá tu nombre y teléfono.')
      return true
    }
    return false
  }

  async function confirmarReserva() {
    const pedido = datosDelPedido()
    if (!pedido || faltanDatos()) return
    setEnviando(true)
    setErrorFormulario(null)
    try {
      setReservaCreada(await reservasApi.solicitar(pedido))
      setRecarga((n) => n + 1)
    } catch (e: unknown) {
      setErrorFormulario(obtenerMensajeErrorApi(e))
    } finally {
      setEnviando(false)
    }
  }

  async function pagarSenia() {
    const pedido = datosDelPedido()
    if (!pedido || faltanDatos()) return
    setEnviando(true)
    setErrorFormulario(null)
    try {
      const { referencia, initPoint } = await pagosApi.crearPagoReserva(pedido)
      sessionStorage.setItem('rp-pago-pendiente', referencia)
      window.location.href = initPoint
    } catch (e: unknown) {
      setErrorFormulario(obtenerMensajeErrorApi(e))
      setEnviando(false)
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-rp-accent">Turnos</p>
      <h1 className="mt-2 text-3xl font-black text-rp-text">Reservar una cancha</h1>
      <p className="mt-1 text-sm text-rp-muted">
        Elegí el día y el horario que te sirve. Después te mostramos qué canchas quedan libres y
        cuánto sale cada duración.
      </p>

      {lugares.length > 1 && (
        <Select
          label="Sucursal"
          className="mt-6 sm:max-w-xs"
          value={lugarId ?? ''}
          onChange={(e) => setLugarId(e.target.value ? Number(e.target.value) : null)}
        >
          {lugares.map((lugar) => <option key={lugar.id} value={lugar.id}>{lugar.nombre}</option>)}
        </Select>
      )}

      <div className="mt-6">
        <span className="text-xs font-black uppercase tracking-[0.14em] text-rp-muted">Elegí el día</span>
        <div className="mt-2 flex items-stretch gap-1.5">
          <button
            onClick={() => cambiarSemana(-7)}
            disabled={inicioSemana.getTime() <= semanaActual}
            className="flex shrink-0 items-center justify-center rounded-md border border-rp-border px-1.5 text-rp-muted disabled:opacity-40 hover:enabled:border-rp-accent hover:enabled:text-rp-accent"
            aria-label="Semana anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="grid flex-1 grid-cols-7 gap-1.5">
            {dias.map((dia, indice) => {
              const iso = aISO(dia)
              const esPasado = iso < hoy
              const seleccionado = iso === fecha
              return (
                <button
                  key={iso}
                  disabled={esPasado}
                  onClick={() => setFecha(iso)}
                  aria-label={dia.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  aria-pressed={seleccionado}
                  className={
                    seleccionado
                      ? 'flex flex-col items-center gap-0.5 rounded-md border border-rp-accent bg-rp-accent px-1 py-2 text-white'
                      : esPasado
                        ? 'flex flex-col items-center gap-0.5 rounded-md border border-rp-border bg-rp-surface-2 px-1 py-2 text-rp-muted/55'
                        : 'flex flex-col items-center gap-0.5 rounded-md border border-rp-border bg-rp-surface px-1 py-2 text-rp-text hover:border-rp-accent'
                  }
                >
                  <span className="text-[10px] font-black uppercase tracking-wide">{NOMBRES_DIA[indice]}</span>
                  <span className="text-base font-black leading-none">{dia.getDate()}</span>
                  <span className="text-[9px] font-bold uppercase opacity-70">
                    {dia.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')}
                  </span>
                </button>
              )
            })}
          </div>
          <button
            onClick={() => cambiarSemana(7)}
            className="flex shrink-0 items-center justify-center rounded-md border border-rp-border px-1.5 text-rp-muted hover:border-rp-accent hover:text-rp-accent"
            aria-label="Semana siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="mt-6">
        <p className="flex items-center gap-1.5 text-sm font-bold text-rp-muted">
          <MapPin size={15} className="text-rp-accent" />
          {lugarNombre || 'Sucursal'}
        </p>

        <div className="mt-3">
          {error && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{error}</p>}
          {franjas.length === 0 && cargando ? (
            <p className="text-sm text-rp-muted">Buscando horarios libres...</p>
          ) : franjas.length === 0 ? (
            <p className="text-sm text-rp-muted">No queda ningún horario libre este día. Probá con otra fecha.</p>
          ) : (
            <div className={`grid grid-cols-2 gap-2 transition-opacity duration-150 sm:grid-cols-3 ${cargando ? 'pointer-events-none opacity-50' : 'opacity-100'}`}>
              {franjas.map((franja) => (
                <button
                  key={franja.horaInicio}
                  onClick={() => { setFranjaAbierta(franja); setCanchaElegida(null) }}
                  data-testid={`horario-${hhmm(franja.horaInicio)}`}
                  className="flex flex-col gap-1 rounded-lg border border-rp-accent/45 bg-rp-accent/10 px-3 py-2.5 text-left transition hover:border-rp-accent hover:bg-rp-accent/20"
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-lg font-black leading-none text-rp-text">{hhmm(franja.horaInicio)}</span>
                    {franja.enPromocion && (
                      <span className="rounded-full bg-rp-amber/25 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-rp-amber">Promo</span>
                    )}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-rp-muted">
                    <span className="size-1.5 rounded-full bg-rp-accent" />
                    {franja.canchasDisponibles} {franja.canchasDisponibles === 1 ? 'cancha' : 'canchas'}
                  </span>
                  {franja.precioDesde != null && (
                    <span className="text-xs font-semibold text-rp-muted">desde {formatearMoneda(franja.precioDesde)}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Paso 2: qué cancha. Paso 3: cuánto jugar (solo si hay más de una opción). */}
      <Modal
        isOpen={franjaAbierta !== null}
        onClose={cerrarTodo}
        title={canchaElegida ? `${canchaElegida.canchaNombre} · ${hhmm(franjaAbierta?.horaInicio ?? '')} hs` : `Canchas libres a las ${hhmm(franjaAbierta?.horaInicio ?? '')}`}
        size="sm"
      >
        {franjaAbierta && !canchaElegida && (
          <div className="flex flex-col gap-2">
            {franjaAbierta.canchas.map((cancha) => {
              const masLarga = cancha.opciones[cancha.opciones.length - 1]
              return (
                <button
                  key={cancha.canchaId}
                  onClick={() => elegirCancha(cancha)}
                  className="rounded-md border border-rp-border px-4 py-3 text-left transition hover:border-rp-accent hover:bg-rp-accent/10"
                >
                  <p className="text-sm font-black text-rp-text">{cancha.canchaNombre}</p>
                  {cancha.tipo && <p className="text-xs text-rp-muted">{cancha.tipo}</p>}
                  <p className="mt-0.5 text-xs font-semibold text-rp-accent">
                    Hasta {etiquetaDuracion(masLarga.minutos)}
                  </p>
                </button>
              )
            })}
          </div>
        )}

        {franjaAbierta && canchaElegida && (
          <div className="flex flex-col gap-3">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-rp-muted">Duración</span>
            <div className="grid grid-cols-3 gap-2">
              {canchaElegida.opciones.map((opcion) => (
                <button
                  key={opcion.minutos}
                  data-testid={`duracion-${opcion.minutos}`}
                  onClick={() => abrirConfirmacion({ franja: franjaAbierta, cancha: canchaElegida, opcion })}
                  className="flex flex-col items-center gap-1.5 rounded-lg border border-rp-border bg-rp-surface px-2 py-3 transition hover:border-rp-accent hover:bg-rp-accent/10"
                >
                  <Clock size={18} className="text-rp-accent" />
                  <span className="text-sm font-black text-rp-text">{etiquetaDuracion(opcion.minutos)}</span>
                  <span className="text-xs font-bold text-rp-accent">
                    {opcion.precio != null ? formatearMoneda(opcion.precio) : 'A consultar'}
                  </span>
                  <span className="text-[10px] text-rp-muted">hasta {hhmm(opcion.horaFin)}</span>
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setCanchaElegida(null)}>Elegir otra cancha</Button>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={eleccion !== null}
        onClose={cerrarTodo}
        onSubmit={reservaCreada ? undefined : (metodoEfectivo ? confirmarReserva : pagarSenia)}
        title={reservaCreada ? 'Turno solicitado' : 'Confirmar reserva'}
        size="sm"
      >
        {reservaCreada ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-rp-text">
              Tu turno quedó <strong>pendiente</strong> en {reservaCreada.canchaNombre}:
            </p>
            <div className="rounded-md border border-rp-border bg-rp-surface-2 px-3 py-2 text-sm">
              <span className="font-bold text-rp-text">
                {reservaCreada.fecha} · {hhmm(reservaCreada.horaInicio)} a {hhmm(reservaCreada.horaFin)} hs
              </span>
              <span className="ml-2 text-xs text-rp-muted">código {reservaCreada.codigo}</span>
            </div>
            <p className="text-sm text-rp-muted">Confirmalo con el club por WhatsApp:</p>
            <a
              href={enlaceWhatsApp(reservaCreada)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-md bg-rp-accent px-4 py-2.5 text-sm font-black text-rp-bg transition hover:opacity-90"
            >
              Confirmar por WhatsApp
            </a>
            {/* El enlace del turno se ofrece acá y no solo por mail: el que no dejó mail
                también tiene que poder volver a su turno para cancelarlo. */}
            {reservaCreada.tokenPublico && (
              <Link
                to={`/mi-turno/${reservaCreada.tokenPublico}`}
                className="inline-flex items-center justify-center rounded-md border border-rp-border px-4 py-2.5 text-sm font-bold text-rp-text transition hover:border-rp-accent"
              >
                Ver mi turno
              </Link>
            )}
            <p className="text-xs text-rp-muted">
              {email.trim()
                ? 'Te mandamos el comprobante por mail con este enlace.'
                : 'Guardá este enlace: desde ahí podés ver o cancelar tu turno.'}
            </p>
            <Button variant="ghost" size="sm" onClick={cerrarTodo}>Cerrar</Button>
          </div>
        ) : eleccion && (
          <div className="flex flex-col gap-4">
            <div className="rounded-md border border-rp-border bg-rp-surface-2 px-3 py-2 text-sm">
              <p className="font-bold text-rp-text">{lugarNombre} · {eleccion.cancha.canchaNombre}</p>
              <p className="mt-0.5 text-rp-muted">
                {fecha} · {hhmm(eleccion.franja.horaInicio)} a {hhmm(eleccion.opcion.horaFin)} hs
                <span className="ml-1 font-semibold">({etiquetaDuracion(eleccion.opcion.minutos)})</span>
              </p>
            </div>

            <div className="rounded-md border border-rp-border px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-rp-muted">Precio del turno</span>
                <strong className="text-rp-text">{precio != null ? formatearMoneda(precio) : 'Sin precio'}</strong>
              </div>
              {montoSenia != null && (
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-rp-muted">Seña <span className="text-xs font-bold text-rp-accent">A pagar ahora</span></span>
                  <strong className="text-rp-accent">{formatearMoneda(montoSenia)}</strong>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold text-rp-muted">Método de pago</p>
              {montoSenia != null && (
                <button
                  type="button"
                  onClick={() => setMetodoPago('ONLINE')}
                  className={metodoPago === 'ONLINE'
                    ? 'rounded-md border border-rp-accent bg-rp-accent/10 px-3 py-2 text-left'
                    : 'rounded-md border border-rp-border px-3 py-2 text-left hover:border-rp-accent/50'}
                >
                  <span className="block text-sm font-bold text-rp-text">Pagar seña online</span>
                  <span className="block text-xs text-rp-muted">Mercado Pago · {formatearMoneda(montoSenia)}. Confirma solo.</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setMetodoPago('EFECTIVO')}
                className={metodoEfectivo
                  ? 'rounded-md border border-rp-accent bg-rp-accent/10 px-3 py-2 text-left'
                  : 'rounded-md border border-rp-border px-3 py-2 text-left hover:border-rp-accent/50'}
              >
                <span className="block text-sm font-bold text-rp-text">Efectivo en el lugar</span>
                <span className="block text-xs text-rp-muted">Pagás al llegar. El club confirma el turno.</span>
              </button>
            </div>

            <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" />
            <Input label="Teléfono" type="tel" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="385..." />
            {/* Opcional a propósito: cada campo obligatorio antes de la cancha es gente que
                se va. El que lo deja, recibe el comprobante y el recordatorio. */}
            <Input
              label="Mail (opcional)"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Para recibir el comprobante"
            />

            {errorFormulario && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorFormulario}</p>}
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={cerrarTodo} disabled={enviando}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={enviando}>
                {enviando
                  ? (metodoEfectivo ? 'Enviando...' : 'Redirigiendo...')
                  : (metodoEfectivo ? 'Confirmar reserva' : `Pagar seña ${formatearMoneda(montoSenia)}`)}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  )
}
