import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { brand } from '@/config/brand'
import { canchasApi, placesApi } from '@/features/catalog/catalogApi'
import { pagosApi } from '@/features/pagos/pagosApi'
import { reservasApi, type ReservaResponse, type SlotDisponibilidad } from '@/features/reservas/reservasApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { formatearMoneda } from '@/shared/lib/formatters'
import type { CanchaResponse, LugarResponse } from '@/shared/types/api'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Select } from '@/shared/ui/Select'

const NOMBRES_DIA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function aISO(fecha: Date) {
  const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function hoyISO() {
  return aISO(new Date())
}

function lunesDeLaSemana(base: Date) {
  const dia = new Date(base)
  const desplazamiento = (dia.getDay() + 6) % 7
  dia.setDate(dia.getDate() - desplazamiento)
  dia.setHours(0, 0, 0, 0)
  return dia
}

function hhmm(hora: string) {
  return hora.slice(0, 5)
}

function minutosDeHora(hora: string) {
  const [h, m] = hhmm(hora).split(':').map(Number)
  return h * 60 + m
}

function rango(horaInicio: string, horaFin: string) {
  return `${hhmm(horaInicio)}-${hhmm(horaFin)}`
}

function enlaceWhatsApp(reservas: ReservaResponse[]) {
  const telefono = brand.phone.replace(/\D/g, '')
  const primera = reservas[0]
  const lineas = reservas.map((reserva) => `- ${reserva.fecha} ${rango(reserva.horaInicio, reserva.horaFin)} hs (código ${reserva.codigo})`).join('\n')
  const encabezado = reservas.length > 1 ? 'Quiero confirmar estos turnos' : 'Quiero confirmar mi turno'
  const texto = `Hola! ${encabezado} en ${primera.canchaNombre} a nombre de ${primera.clienteNombre}:\n${lineas}`
  return `https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`
}

export default function ReservarPage() {
  const [lugares, setLugares] = useState<LugarResponse[]>([])
  const [canchas, setCanchas] = useState<CanchaResponse[]>([])
  const [lugarId, setLugarId] = useState<number | null>(null)
  const [canchaId, setCanchaId] = useState<number | null>(null)

  const [inicioSemana, setInicioSemana] = useState(() => lunesDeLaSemana(new Date()))
  const [fecha, setFecha] = useState(hoyISO())
  const [slots, setSlots] = useState<SlotDisponibilidad[]>([])
  const [recarga, setRecarga] = useState(0)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [horariosElegidos, setHorariosElegidos] = useState<string[]>([])
  const [slotDuracion, setSlotDuracion] = useState<SlotDisponibilidad | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [metodoPago, setMetodoPago] = useState<'ONLINE' | 'EFECTIVO'>('EFECTIVO')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null)
  const [reservasCreadas, setReservasCreadas] = useState<ReservaResponse[]>([])

  useEffect(() => {
    Promise.all([placesApi.getAll(), canchasApi.getAll()])
      .then(([lugaresData, canchasData]) => {
        setLugares(lugaresData)
        setCanchas(canchasData)
        const lugarGuardado = Number(sessionStorage.getItem('rp-turnos-lugar'))
        const canchaGuardada = Number(sessionStorage.getItem('rp-turnos-cancha'))
        const primeraConCancha = lugaresData.find((lugar) => canchasData.some((cancha) => cancha.lugarId === lugar.id))
        const lugarInicial = lugaresData.some((lugar) => lugar.id === lugarGuardado)
          ? lugarGuardado
          : primeraConCancha?.id ?? lugaresData[0]?.id ?? null
        setLugarId(lugarInicial)
        const canchaGuardadaValida = canchasData.find((cancha) => cancha.id === canchaGuardada && cancha.lugarId === lugarInicial)
        const primeraCancha = canchaGuardadaValida ?? canchasData.find((cancha) => cancha.lugarId === lugarInicial) ?? canchasData[0] ?? null
        setCanchaId(primeraCancha?.id ?? null)
      })
      .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
  }, [])

  useEffect(() => {
    if (lugarId != null) sessionStorage.setItem('rp-turnos-lugar', String(lugarId))
  }, [lugarId])

  useEffect(() => {
    if (canchaId != null) sessionStorage.setItem('rp-turnos-cancha', String(canchaId))
  }, [canchaId])

  const canchasDelLugar = useMemo(
    () => canchas.filter((cancha) => cancha.lugarId === lugarId),
    [canchas, lugarId],
  )

  function elegirLugar(nuevoLugarId: number | null) {
    setLugarId(nuevoLugarId)
    const primeraCancha = canchas.find((cancha) => cancha.lugarId === nuevoLugarId)
    setCanchaId(primeraCancha?.id ?? null)
  }

  const dias = useMemo(() => {
    return Array.from({ length: 7 }, (_, indice) => {
      const dia = new Date(inicioSemana)
      dia.setDate(dia.getDate() + indice)
      return dia
    })
  }, [inicioSemana])

  const hoy = hoyISO()

  useEffect(() => {
    if (canchaId == null) return
    let activo = true
    setHorariosElegidos([])
    setCargando(true)
    reservasApi.getDisponibilidad(canchaId, fecha)
      .then((datos) => { if (activo) { setSlots(datos); setError(null) } })
      .catch((e: unknown) => { if (activo) setError(obtenerMensajeErrorApi(e)) })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [canchaId, fecha, recarga])

  useEffect(() => {
    const pendiente = sessionStorage.getItem('rp-pago-pendiente')
    if (!pendiente) return
    sessionStorage.removeItem('rp-pago-pendiente')
    pagosApi.obtenerPago(pendiente)
      .then((pago) => (pago.estado === 'APROBADO' ? null : pagosApi.cancelarPagoReserva(pendiente)))
      .catch(() => {})
      .finally(() => setRecarga((n) => n + 1))
  }, [])

  const canchaNombre = useMemo(
    () => canchas.find((cancha) => cancha.id === canchaId)?.nombre ?? '',
    [canchas, canchaId],
  )
  const lugarNombre = useMemo(
    () => lugares.find((lugar) => lugar.id === lugarId)?.nombre ?? '',
    [lugares, lugarId],
  )

  const semanaActual = lunesDeLaSemana(new Date()).getTime()
  const puedeRetroceder = inicioSemana.getTime() > semanaActual
  const puedeAvanzar = inicioSemana.getTime() < semanaActual + 7 * 24 * 60 * 60 * 1000

  function cambiarSemana(deltaDias: number) {
    setInicioSemana((actual) => {
      const siguiente = new Date(actual)
      siguiente.setDate(siguiente.getDate() + deltaDias)
      return siguiente
    })
  }

  function slotConsecutivo(slot: SlotDisponibilidad) {
    return slots.find((otro) => otro.horaInicio === slot.horaFin && otro.disponible) ?? null
  }

  function elegirSlot(slot: SlotDisponibilidad) {
    if (horariosElegidos.includes(slot.horaInicio)) {
      setHorariosElegidos((actuales) => actuales.filter((hora) => hora !== slot.horaInicio))
      return
    }
    setSlotDuracion(slot)
  }

  function agregarDuracion(horas: 1 | 2) {
    if (!slotDuracion) return
    const inicios = [slotDuracion.horaInicio]
    if (horas === 2) {
      const consecutivo = slotConsecutivo(slotDuracion)
      if (consecutivo) inicios.push(consecutivo.horaInicio)
    }
    setHorariosElegidos((actuales) => [...new Set([...actuales, ...inicios])])
    setSlotDuracion(null)
  }

  const rangosElegidos = useMemo(() => {
    const finPorInicio = new Map(slots.map((slot) => [slot.horaInicio, slot.horaFin]))
    const inicios = [...horariosElegidos].sort()
    const rangos: string[] = []
    let i = 0
    while (i < inicios.length) {
      const inicio = inicios[i]
      let fin = finPorInicio.get(inicio) ?? inicio
      let j = i + 1
      while (j < inicios.length && inicios[j] === fin) {
        fin = finPorInicio.get(inicios[j]) ?? fin
        j++
      }
      rangos.push(rango(inicio, fin))
      i = j
    }
    return rangos
  }, [horariosElegidos, slots])

  const canchaSeleccionada = useMemo(
    () => canchas.find((cancha) => cancha.id === canchaId) ?? null,
    [canchas, canchaId],
  )
  const precioPorHora = canchaSeleccionada?.precioPorHora ?? null
  const porcentajeSenia = canchaSeleccionada?.seniaPorcentaje && canchaSeleccionada.seniaPorcentaje > 0
    ? canchaSeleccionada.seniaPorcentaje
    : 50
  const minutosElegidos = useMemo(() => {
    const finPorInicio = new Map(slots.map((slot) => [slot.horaInicio, slot.horaFin]))
    return horariosElegidos.reduce((acumulado, inicio) => {
      const fin = finPorInicio.get(inicio)
      if (!fin) return acumulado
      const duracion = minutosDeHora(fin) - minutosDeHora(inicio)
      return acumulado + (duracion > 0 ? duracion : duracion + 1440)
    }, 0)
  }, [horariosElegidos, slots])
  const precioTotalEstimado = precioPorHora != null ? Math.round((minutosElegidos / 60) * precioPorHora) : null
  const montoSeniaEstimado = precioTotalEstimado != null
    ? Math.round((precioTotalEstimado * porcentajeSenia) / 100)
    : null
  const hayPrecio = montoSeniaEstimado != null
  const metodoEfectivo = !hayPrecio || metodoPago === 'EFECTIVO'

  function abrirModal() {
    if (horariosElegidos.length === 0) return
    setNombre('')
    setTelefono('')
    setErrorFormulario(null)
    setReservasCreadas([])
    setMetodoPago(precioPorHora != null ? 'ONLINE' : 'EFECTIVO')
    setModalAbierto(true)
  }

  function cerrarModal() {
    setModalAbierto(false)
    setErrorFormulario(null)
  }

  async function confirmarReserva() {
    if (canchaId == null || horariosElegidos.length === 0) return
    if (!nombre.trim() || !telefono.trim()) {
      setErrorFormulario('Completá tu nombre y teléfono.')
      return
    }
    setEnviando(true)
    setErrorFormulario(null)
    try {
      const reservas = await reservasApi.solicitarLote({
        canchaId,
        fecha,
        horarios: horariosElegidos,
        clienteNombre: nombre.trim(),
        clienteTelefono: telefono.trim(),
      })
      setReservasCreadas(reservas)
      setHorariosElegidos([])
      const datos = await reservasApi.getDisponibilidad(canchaId, fecha)
      setSlots(datos)
    } catch (e: unknown) {
      setErrorFormulario(obtenerMensajeErrorApi(e))
    } finally {
      setEnviando(false)
    }
  }

  async function pagarSenia() {
    if (canchaId == null || horariosElegidos.length === 0) return
    if (!nombre.trim() || !telefono.trim()) {
      setErrorFormulario('Completá tu nombre y teléfono.')
      return
    }
    setEnviando(true)
    setErrorFormulario(null)
    try {
      const { referencia, initPoint } = await pagosApi.crearPagoReserva({
        canchaId,
        fecha,
        horarios: horariosElegidos,
        clienteNombre: nombre.trim(),
        clienteTelefono: telefono.trim(),
      })
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
      <p className="mt-1 text-sm text-rp-muted">Elegí sucursal, cancha y día, marcá uno o varios horarios y pedilos todos juntos. Después los confirmás con el club por WhatsApp.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Select label="Sucursal" value={lugarId ?? ''} onChange={(e) => elegirLugar(e.target.value ? Number(e.target.value) : null)}>
          {lugares.map((lugar) => (
            <option key={lugar.id} value={lugar.id}>{lugar.nombre}</option>
          ))}
        </Select>
        <Select label="Cancha" value={canchaId ?? ''} onChange={(e) => setCanchaId(e.target.value ? Number(e.target.value) : null)}>
          {canchasDelLugar.length === 0 ? <option value="">Sin canchas</option> : null}
          {canchasDelLugar.map((cancha) => (
            <option key={cancha.id} value={cancha.id}>{cancha.nombre}</option>
          ))}
        </Select>
      </div>

      <div className="mt-6">
        <span className="text-xs font-black uppercase tracking-[0.14em] text-rp-muted">Elegí el día</span>
        <div className="mt-2 flex items-stretch gap-1.5">
          <button
            onClick={() => cambiarSemana(-7)}
            disabled={!puedeRetroceder}
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
            disabled={!puedeAvanzar}
            className="flex shrink-0 items-center justify-center rounded-md border border-rp-border px-1.5 text-rp-muted disabled:opacity-40 hover:enabled:border-rp-accent hover:enabled:text-rp-accent"
            aria-label="Semana siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="mt-6">
        <p className="flex items-center gap-1.5 text-sm font-bold text-rp-muted">
          <MapPin size={15} className="text-rp-accent" />
          {lugarNombre || 'Sucursal'}{canchaNombre ? ` · ${canchaNombre}` : ''}
        </p>

        <div className="mt-3">
          {error && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{error}</p>}
          {slots.length === 0 && cargando ? (
            <p className="text-sm text-rp-muted">Cargando disponibilidad...</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-rp-muted">No hay turnos disponibles para esta cancha en esta fecha. Probá con otro día o cancha.</p>
          ) : (
            <div className={`grid grid-cols-2 gap-2 transition-opacity duration-150 sm:grid-cols-3 ${cargando ? 'pointer-events-none opacity-50' : 'opacity-100'}`}>
              {slots.map((slot) => {
                const elegido = horariosElegidos.includes(slot.horaInicio)
                return (
                  <button
                    key={slot.horaInicio}
                    disabled={!slot.disponible}
                    onClick={() => elegirSlot(slot)}
                    aria-pressed={elegido}
                    className={
                      !slot.disponible
                        ? 'cursor-not-allowed rounded-md border border-rp-border bg-rp-surface-2 px-3 py-2 text-sm font-semibold text-rp-muted line-through'
                        : elegido
                          ? 'rounded-md border border-rp-accent bg-rp-accent px-3 py-2 text-sm font-black text-white transition'
                          : 'rounded-md border border-rp-accent/50 bg-rp-accent/15 px-3 py-2 text-sm font-bold text-rp-text transition hover:bg-rp-accent/25'
                    }
                  >
                    {hhmm(slot.horaInicio)}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {horariosElegidos.length > 0 && (
        <div className="sticky bottom-4 z-10 mt-5 flex items-center justify-between gap-3 rounded-xl border border-rp-accent/40 bg-rp-surface/95 px-4 py-3 shadow-lg backdrop-blur">
          <span className="text-sm font-bold text-rp-text">
            {horariosElegidos.length} {horariosElegidos.length === 1 ? 'turno' : 'turnos'}
            <span className="ml-1 font-semibold text-rp-muted">· {rangosElegidos.join(', ')} hs</span>
          </span>
          <Button size="sm" onClick={abrirModal}>Reservar ({horariosElegidos.length})</Button>
        </div>
      )}

      <Modal isOpen={modalAbierto} onClose={cerrarModal} onSubmit={reservasCreadas.length > 0 ? undefined : (metodoEfectivo ? confirmarReserva : pagarSenia)} title={reservasCreadas.length > 0 ? 'Turnos solicitados' : 'Confirmar reserva'} size="sm">
        {reservasCreadas.length > 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-rp-text">
              {reservasCreadas.length === 1 ? 'Tu turno quedó' : `Tus ${reservasCreadas.length} turnos quedaron`} <strong>pendiente{reservasCreadas.length === 1 ? '' : 's'}</strong> en {reservasCreadas[0].canchaNombre}:
            </p>
            <ul className="flex flex-col gap-1.5">
              {reservasCreadas.map((reserva) => (
                <li key={reserva.id} className="flex items-center justify-between rounded-md border border-rp-border bg-rp-surface-2 px-3 py-2 text-sm">
                  <span className="font-bold text-rp-text">{reserva.fecha} · {rango(reserva.horaInicio, reserva.horaFin)} hs</span>
                  <span className="text-xs text-rp-muted">código {reserva.codigo}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-rp-muted">Confirmalos con el club por WhatsApp:</p>
            <a
              href={enlaceWhatsApp(reservasCreadas)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-md bg-rp-accent px-4 py-2.5 text-sm font-black text-rp-bg transition hover:opacity-90"
            >
              Confirmar por WhatsApp
            </a>
            <Button variant="ghost" size="sm" onClick={cerrarModal}>Cerrar</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-md border border-rp-border bg-rp-surface-2 px-3 py-2 text-sm">
              <p className="font-bold text-rp-text">{lugarNombre} · {canchaNombre}</p>
              <p className="mt-0.5 text-rp-muted">{fecha} · {rangosElegidos.join(', ')} hs</p>
            </div>

            <div className="rounded-md border border-rp-border px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-rp-muted">Precio total del turno</span>
                <strong className="text-rp-text">{hayPrecio ? formatearMoneda(precioTotalEstimado) : 'Sin precio'}</strong>
              </div>
              {hayPrecio && (
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-rp-muted">Monto de la seña <span className="text-xs font-bold text-rp-accent">A pagar ahora</span></span>
                  <strong className="text-rp-accent">{formatearMoneda(montoSeniaEstimado)}</strong>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold text-rp-muted">Método de pago</p>
              {hayPrecio && (
                <button
                  type="button"
                  onClick={() => setMetodoPago('ONLINE')}
                  className={metodoPago === 'ONLINE'
                    ? 'flex items-center justify-between rounded-md border border-rp-accent bg-rp-accent/10 px-3 py-2 text-left'
                    : 'flex items-center justify-between rounded-md border border-rp-border px-3 py-2 text-left hover:border-rp-accent/50'}
                >
                  <span>
                    <span className="block text-sm font-bold text-rp-text">Pagar seña online</span>
                    <span className="block text-xs text-rp-muted">Mercado Pago · {formatearMoneda(montoSeniaEstimado)}. Confirma solo.</span>
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setMetodoPago('EFECTIVO')}
                className={metodoEfectivo
                  ? 'flex items-center justify-between rounded-md border border-rp-accent bg-rp-accent/10 px-3 py-2 text-left'
                  : 'flex items-center justify-between rounded-md border border-rp-border px-3 py-2 text-left hover:border-rp-accent/50'}
              >
                <span>
                  <span className="block text-sm font-bold text-rp-text">Efectivo en el lugar</span>
                  <span className="block text-xs text-rp-muted">Pagás al llegar. El club confirma el turno.</span>
                </span>
              </button>
            </div>

            <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" />
            <Input label="Teléfono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="385..." />

            {errorFormulario && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorFormulario}</p>}
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={cerrarModal} disabled={enviando}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={enviando}>
                {enviando ? (metodoEfectivo ? 'Enviando...' : 'Redirigiendo...') : (metodoEfectivo ? 'Confirmar reserva' : `Pagar seña ${formatearMoneda(montoSeniaEstimado)}`)}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={slotDuracion !== null} onClose={() => setSlotDuracion(null)} title="¿Cuánto querés jugar?" size="sm">
        {slotDuracion && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-rp-muted">Turno en {canchaNombre} desde las {hhmm(slotDuracion.horaInicio)} hs.</p>
            <button
              onClick={() => agregarDuracion(1)}
              className="flex items-center justify-between rounded-md border border-rp-accent/50 bg-rp-accent/10 px-4 py-3 text-left transition hover:bg-rp-accent/20"
            >
              <span className="text-sm font-black text-rp-text">1 hora</span>
              <span className="text-sm font-bold text-rp-accent">{rango(slotDuracion.horaInicio, slotDuracion.horaFin)} hs</span>
            </button>
            {(() => {
              const consecutivo = slotConsecutivo(slotDuracion)
              return (
                <button
                  onClick={() => agregarDuracion(2)}
                  disabled={!consecutivo}
                  className={
                    consecutivo
                      ? 'flex items-center justify-between rounded-md border border-rp-accent/50 bg-rp-accent/10 px-4 py-3 text-left transition hover:bg-rp-accent/20'
                      : 'flex cursor-not-allowed items-center justify-between rounded-md border border-rp-border bg-rp-surface-2 px-4 py-3 text-left opacity-60'
                  }
                >
                  <span className="text-sm font-black text-rp-text">2 horas</span>
                  <span className="text-sm font-bold text-rp-accent">
                    {consecutivo ? `${rango(slotDuracion.horaInicio, consecutivo.horaFin)} hs` : 'Sin disponibilidad'}
                  </span>
                </button>
              )
            })()}
          </div>
        )}
      </Modal>
    </section>
  )
}
