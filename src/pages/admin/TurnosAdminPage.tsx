import { CalendarClock, Check, ChevronLeft, ChevronRight, MapPin, Settings, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { canchasApi, placesApi } from '@/features/catalog/catalogApi'
import { horariosCanchaApi, reservasApi, type HorarioCanchaRequest, type ReservaResponse } from '@/features/reservas/reservasApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import type { CanchaResponse, LugarResponse } from '@/shared/types/api'
import { AdminPageHeader } from '@/shared/ui/AdminPageHeader'
import { AdminTable, type Column } from '@/shared/ui/AdminTable'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Select } from '@/shared/ui/Select'
import { useToast } from '@/shared/ui/Toast'

const NOMBRES_DIA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function aISO(fecha: Date) {
  const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
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

const HORARIO_VACIO: HorarioCanchaRequest = {
  canchaId: 0,
  horaApertura: '18:00',
  horaCierre: '23:00',
  diasActivos: '1,2,3,4,5,6,7',
  duracionSlotMin: 60,
  anticipacionDias: 14,
}

export default function TurnosAdminPage() {
  const [lugares, setLugares] = useState<LugarResponse[]>([])
  const [canchas, setCanchas] = useState<CanchaResponse[]>([])
  const [lugarId, setLugarId] = useState<number | null>(null)
  const [canchaId, setCanchaId] = useState<number | null>(null)
  const [inicioSemana, setInicioSemana] = useState(() => lunesDeLaSemana(new Date()))
  const [fecha, setFecha] = useState(aISO(new Date()))
  const [reservas, setReservas] = useState<ReservaResponse[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { success: avisoExito } = useToast()

  const [horarioAbierto, setHorarioAbierto] = useState(false)
  const [horario, setHorario] = useState<HorarioCanchaRequest>(HORARIO_VACIO)
  const [guardandoHorario, setGuardandoHorario] = useState(false)
  const [errorHorario, setErrorHorario] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([placesApi.getAll(), canchasApi.getAll()])
      .then(([lugaresData, canchasData]) => {
        setLugares(lugaresData)
        setCanchas(canchasData)
        const lugarInicial = lugaresData.find((l) => canchasData.some((c) => c.lugarId === l.id))?.id ?? lugaresData[0]?.id ?? null
        setLugarId(lugarInicial)
        setCanchaId(canchasData.find((c) => c.lugarId === lugarInicial)?.id ?? null)
      })
      .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
  }, [])

  const canchasDelLugar = useMemo(() => canchas.filter((c) => c.lugarId === lugarId), [canchas, lugarId])

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
    reservasApi.listar(idCancha, dia)
      .then((datos) => { setReservas([...datos].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))); setError(null) })
      .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    if (canchaId == null) return
    cargarReservas(canchaId, fecha)
  }, [canchaId, fecha])

  async function ejecutarAccion(accion: () => Promise<unknown>, mensaje: string) {
    if (canchaId == null) return
    try {
      await accion()
      avisoExito(mensaje)
      cargarReservas(canchaId, fecha)
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    }
  }

  function abrirHorario() {
    if (canchaId == null) return
    const idCancha = canchaId
    setErrorHorario(null)
    horariosCanchaApi.listar(idCancha)
      .then((lista) => {
        const activo = lista.find((h) => h.activo) ?? lista[0]
        setHorario(activo
          ? {
              canchaId: idCancha,
              horaApertura: hhmm(activo.horaApertura),
              horaCierre: hhmm(activo.horaCierre),
              diasActivos: activo.diasActivos ?? '1,2,3,4,5,6,7',
              duracionSlotMin: activo.duracionSlotMin,
              anticipacionDias: activo.anticipacionDias,
            }
          : { ...HORARIO_VACIO, canchaId: idCancha })
        setHorarioAbierto(true)
      })
      .catch(() => { setHorario({ ...HORARIO_VACIO, canchaId: idCancha }); setHorarioAbierto(true) })
  }

  async function guardarHorario() {
    if (lugarId == null) return
    setGuardandoHorario(true)
    setErrorHorario(null)
    try {
      await horariosCanchaApi.guardarSucursal(lugarId, horario)
      avisoExito('Horario guardado para todas las canchas de la sucursal')
      setHorarioAbierto(false)
      if (canchaId != null) cargarReservas(canchaId, fecha)
    } catch (e: unknown) {
      setErrorHorario(obtenerMensajeErrorApi(e))
    } finally {
      setGuardandoHorario(false)
    }
  }

  const columnas = useMemo(() => [
    { key: 'horario', label: 'Horario', render: (reserva: ReservaResponse) => <span className="text-sm font-bold text-rp-text">{hhmm(reserva.horaInicio)} - {hhmm(reserva.horaFin)}</span> },
    { key: 'cliente', label: 'Cliente', render: (reserva: ReservaResponse) => <div><p className="text-sm font-bold text-rp-text">{reserva.clienteNombre}</p><p className="text-xs text-rp-muted">{reserva.clienteTelefono}</p></div> },
    { key: 'estado', label: 'Estado', render: (reserva: ReservaResponse) => <span className="text-xs font-black uppercase tracking-wide text-rp-accent">{reserva.estado}</span> },
    { key: 'codigo', label: 'Código', render: (reserva: ReservaResponse) => <span className="text-xs text-rp-muted">{reserva.codigo}</span> },
  ] as Column<ReservaResponse>[], [])

  const hoy = aISO(new Date())

  return (
    <section>
      <AdminPageHeader title={<><CalendarClock size={26} />Turnos</>} action={<Button size="sm" variant="subtle" onClick={abrirHorario}><Settings size={16} />Configurar horario</Button>} />

      <div className="mt-4 grid gap-3 sm:max-w-md sm:grid-cols-2">
        <Select label="Sucursal" value={lugarId ?? ''} onChange={(e) => elegirLugar(e.target.value ? Number(e.target.value) : null)}>
          {lugares.map((lugar) => <option key={lugar.id} value={lugar.id}>{lugar.nombre}</option>)}
        </Select>
        <Select label="Cancha" value={canchaId ?? ''} onChange={(e) => setCanchaId(e.target.value ? Number(e.target.value) : null)}>
          {canchasDelLugar.length === 0 ? <option value="">Sin canchas</option> : null}
          {canchasDelLugar.map((cancha) => <option key={cancha.id} value={cancha.id}>{cancha.nombre}</option>)}
        </Select>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-rp-muted">Día</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setInicioSemana((a) => { const n = new Date(a); n.setDate(n.getDate() - 7); return n })}
              disabled={inicioSemana.getTime() <= lunesDeLaSemana(new Date()).getTime()}
              className="flex size-8 items-center justify-center rounded-md border border-rp-border text-rp-muted disabled:opacity-40 hover:enabled:text-rp-accent" aria-label="Semana anterior"><ChevronLeft size={16} /></button>
            <button onClick={() => setInicioSemana((a) => { const n = new Date(a); n.setDate(n.getDate() + 7); return n })}
              className="flex size-8 items-center justify-center rounded-md border border-rp-border text-rp-muted hover:text-rp-accent" aria-label="Semana siguiente"><ChevronRight size={16} /></button>
          </div>
        </div>
        <div className="mt-2 grid max-w-2xl grid-cols-7 gap-1.5">
          {dias.map((dia, i) => {
            const iso = aISO(dia)
            const sel = iso === fecha
            return (
              <button key={iso} onClick={() => setFecha(iso)}
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
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-sm font-bold text-rp-muted">
        <MapPin size={15} className="text-rp-accent" />
        {lugares.find((l) => l.id === lugarId)?.nombre ?? 'Sucursal'}{canchasDelLugar.find((c) => c.id === canchaId) ? ` · ${canchasDelLugar.find((c) => c.id === canchaId)?.nombre}` : ''}
      </div>

      <div className="mt-3">
        <AdminTable
          columns={columnas}
          rows={reservas}
          getRowKey={(reserva) => reserva.id}
          isLoading={cargando}
          error={error}
          emptyTitle="No hay reservas para esta cancha y día"
          actions={(reserva) => (
            <>
              {reserva.estado === 'PENDIENTE' && (
                <button onClick={() => ejecutarAccion(() => reservasApi.confirmar(reserva.id), 'Turno confirmado')} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent" aria-label="Confirmar"><Check size={15} /></button>
              )}
              {(reserva.estado === 'PENDIENTE' || reserva.estado === 'CONFIRMADA') && (
                <button onClick={() => ejecutarAccion(() => reserva.estado === 'PENDIENTE' ? reservasApi.rechazar(reserva.id) : reservasApi.cancelar(reserva.id), 'Turno liberado')} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger" aria-label="Rechazar o cancelar"><X size={15} /></button>
              )}
            </>
          )}
        />
      </div>

      <Modal isOpen={horarioAbierto} onClose={() => setHorarioAbierto(false)} onSubmit={guardarHorario} title={`Horario de ${lugares.find((l) => l.id === lugarId)?.nombre ?? 'la sucursal'}`} size="sm">
        <div className="flex flex-col gap-4">
          <p className="rounded-md border border-rp-border bg-rp-surface-2 px-3 py-2 text-xs leading-5 text-rp-muted">Este horario se aplica a todas las canchas de la sucursal.</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Apertura" type="time" value={horario.horaApertura} onChange={(e) => setHorario((h) => ({ ...h, horaApertura: e.target.value }))} />
            <Input label="Cierre" type="time" value={horario.horaCierre} onChange={(e) => setHorario((h) => ({ ...h, horaCierre: e.target.value }))} />
          </div>
          <Input label="Días (1=Lun ... 7=Dom)" value={horario.diasActivos ?? ''} onChange={(e) => setHorario((h) => ({ ...h, diasActivos: e.target.value }))} placeholder="1,2,3,4,5,6,7" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Duración slot (min)" type="number" value={horario.duracionSlotMin ?? 60} onChange={(e) => setHorario((h) => ({ ...h, duracionSlotMin: Number(e.target.value) }))} />
            <Input label="Anticipación (días)" type="number" value={horario.anticipacionDias ?? 14} onChange={(e) => setHorario((h) => ({ ...h, anticipacionDias: Number(e.target.value) }))} />
          </div>
          <p className="text-xs leading-5 text-rp-muted">«Anticipación» = con cuántos días de adelanto pueden reservar los jugadores (ej. 14 = hasta dos semanas antes).</p>
          {errorHorario && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorHorario}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setHorarioAbierto(false)} disabled={guardandoHorario}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={guardandoHorario}>{guardandoHorario ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </div>
      </Modal>
    </section>
  )
}
