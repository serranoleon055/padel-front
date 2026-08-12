import { CalendarSync, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { canchasApi, placesApi } from '@/features/catalog/catalogApi'
import { turnosFijosApi, type TurnoFijoRequest, type TurnoFijoResponse } from '@/features/reservas/turnosFijosApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { fechaISO, formatearFecha, formatearMoneda } from '@/shared/lib/formatters'
import { TelefonoWhatsApp } from '@/shared/ui/TelefonoWhatsApp'
import type { CanchaResponse, LugarResponse } from '@/shared/types/api'
import { AdminPageHeader } from '@/shared/ui/AdminPageHeader'
import { AdminTable, type Column } from '@/shared/ui/AdminTable'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Select } from '@/shared/ui/Select'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { useToast } from '@/shared/ui/Toast'

const DIAS = [
  { valor: 1, nombre: 'Lunes' },
  { valor: 2, nombre: 'Martes' },
  { valor: 3, nombre: 'Miércoles' },
  { valor: 4, nombre: 'Jueves' },
  { valor: 5, nombre: 'Viernes' },
  { valor: 6, nombre: 'Sábado' },
  { valor: 7, nombre: 'Domingo' },
]

function etiquetaDuracion(minutos: number) {
  return minutos % 60 === 0 ? `-e h` : ` min`
}

function hhmm(hora: string | null | undefined) {
  return hora ? hora.slice(0, 5) : '-'
}

function hoyISO() {
  return fechaISO()
}

/** El precio se escribe como texto (nada de type=number) y se limpia al enviar. */
function aNumero(valor: string): number | null {
  const limpio = valor.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  if (!limpio) return null
  const numero = Number(limpio)
  return Number.isFinite(numero) ? numero : null
}

const VACIO = {
  canchaId: '',
  diaSemana: '2',
  horaInicio: '20:00',
  duracionMin: '60',
  clienteNombre: '',
  clienteTelefono: '',
  precioPactado: '',
  vigenteDesde: hoyISO(),
  vigenteHasta: '',
  notas: '',
}

export default function TurnosFijosPage() {
  const [elementos, setElementos] = useState<TurnoFijoResponse[]>([])
  const [lugares, setLugares] = useState<LugarResponse[]>([])
  const [canchas, setCanchas] = useState<CanchaResponse[]>([])
  const [lugarId, setLugarId] = useState<number | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { success: avisoExito, error: avisoError } = useToast()

  const [modalAbierto, setModalAbierto] = useState(false)
  const [objetivoEdicion, setObjetivoEdicion] = useState<TurnoFijoResponse | null>(null)
  const [formulario, setFormulario] = useState({ ...VACIO })
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [objetivoBaja, setObjetivoBaja] = useState<TurnoFijoResponse | null>(null)
  const [dandoDeBaja, setDandoDeBaja] = useState(false)
  const [generando, setGenerando] = useState(false)

  useEffect(() => {
    Promise.all([placesApi.getAll(), canchasApi.getAll()])
      .then(([lugaresApi, canchasTodas]) => {
        setLugares(lugaresApi)
        setCanchas(canchasTodas)
        if (lugaresApi.length > 0) setLugarId(lugaresApi[0].id)
      })
      .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
  }, [])

  function cargar() {
    setCargando(true)
    turnosFijosApi.getAll({ lugarId })
      .then((datos) => { setElementos(datos); setError(null) })
      .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
      .finally(() => setCargando(false))
  }
  useEffect(cargar, [lugarId])

  const canchasDelLugar = useMemo(
    () => canchas.filter((cancha) => lugarId == null || cancha.lugarId === lugarId),
    [canchas, lugarId],
  )

  function abrirCrear() {
    setObjetivoEdicion(null)
    setFormulario({ ...VACIO, canchaId: canchasDelLugar[0] ? String(canchasDelLugar[0].id) : '' })
    setErrorFormulario(null)
    setModalAbierto(true)
  }

  function abrirEditar(turno: TurnoFijoResponse) {
    setObjetivoEdicion(turno)
    setFormulario({
      canchaId: String(turno.canchaId),
      diaSemana: String(turno.diaSemana),
      horaInicio: hhmm(turno.horaInicio),
      duracionMin: String(turno.duracionMin),
      clienteNombre: turno.clienteNombre,
      clienteTelefono: turno.clienteTelefono,
      precioPactado: turno.precioPactado != null ? String(turno.precioPactado) : '',
      vigenteDesde: turno.vigenteDesde,
      vigenteHasta: turno.vigenteHasta ?? '',
      notas: turno.notas ?? '',
    })
    setErrorFormulario(null)
    setModalAbierto(true)
  }

  async function guardar() {
    if (!formulario.canchaId) { setErrorFormulario('Elegí la cancha.'); return }
    if (!formulario.clienteNombre.trim() || !formulario.clienteTelefono.trim()) {
      setErrorFormulario('El nombre y el teléfono del cliente son obligatorios.'); return
    }
    const duracionMin = Number(formulario.duracionMin)
    if (![60, 90, 120].includes(duracionMin)) {
      setErrorFormulario('Elegí una duración de 1 hora, 1 hora y media o 2 horas.'); return
    }

    const cuerpo: TurnoFijoRequest = {
      canchaId: Number(formulario.canchaId),
      diaSemana: Number(formulario.diaSemana),
      horaInicio: `${formulario.horaInicio}:00`,
      duracionMin,
      clienteNombre: formulario.clienteNombre.trim(),
      clienteTelefono: formulario.clienteTelefono.trim(),
      precioPactado: aNumero(formulario.precioPactado),
      vigenteDesde: formulario.vigenteDesde,
      vigenteHasta: formulario.vigenteHasta || null,
      notas: formulario.notas.trim() || null,
    }

    setGuardando(true); setErrorFormulario(null)
    try {
      const guardado = objetivoEdicion
        ? await turnosFijosApi.update(objetivoEdicion.id, cuerpo)
        : await turnosFijosApi.create(cuerpo)
      // Generar en el acto: si no, el turno recién creado no aparece en la grilla
      // hasta que corra el scheduler y el club cree que no se guardó.
      const generacion = await turnosFijosApi.generar(guardado.id)
      setModalAbierto(false)
      cargar()
      if (generacion.conflictos.length > 0) {
        avisoError(`Se generaron ${generacion.generadas} turnos, pero ${generacion.conflictos.length} quedaron sin lugar por estar ocupados.`)
      } else {
        avisoExito(`Turno fijo guardado · ${generacion.generadas} turnos agendados`)
      }
    } catch (e: unknown) {
      setErrorFormulario(obtenerMensajeErrorApi(e))
    } finally {
      setGuardando(false)
    }
  }

  async function darDeBaja() {
    if (!objetivoBaja) return
    setDandoDeBaja(true)
    try {
      await turnosFijosApi.remove(objetivoBaja.id)
      setObjetivoBaja(null)
      cargar()
      avisoExito('Turno fijo dado de baja y horarios liberados')
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e)); setObjetivoBaja(null)
    } finally { setDandoDeBaja(false) }
  }

  async function regenerarTodos() {
    setGenerando(true)
    try {
      const resultado = await turnosFijosApi.generarTodos()
      cargar()
      if (resultado.conflictos.length > 0) {
        avisoError(`${resultado.generadas} turnos agendados · ${resultado.conflictos.length} con el horario ocupado`)
      } else {
        avisoExito(`${resultado.generadas} turnos agendados`)
      }
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    } finally { setGenerando(false) }
  }

  const columnas = useMemo(() => [
    {
      key: 'cuando',
      label: 'Cuándo',
      render: (turno: TurnoFijoResponse) => (
        <div>
          <p className="text-sm font-bold text-rp-text">
            {DIAS.find((dia) => dia.valor === turno.diaSemana)?.nombre ?? '-'} {hhmm(turno.horaInicio)}
          </p>
          <p className="text-xs text-rp-muted">
            hasta {hhmm(turno.horaFin)} · {etiquetaDuracion(turno.duracionMin)}
          </p>
        </div>
      ),
    },
    { key: 'cancha', label: 'Cancha', render: (turno: TurnoFijoResponse) => <span className="text-sm text-rp-muted">{turno.canchaNombre}</span> },
    {
      key: 'cliente',
      label: 'Cliente',
      render: (turno: TurnoFijoResponse) => (
        <div>
          <p className="text-sm font-bold text-rp-text">{turno.clienteNombre}</p>
          <TelefonoWhatsApp
            telefono={turno.clienteTelefono}
            mensaje={`Hola ${turno.clienteNombre}! Te escribo por tu turno fijo.`}
          />
        </div>
      ),
    },
    {
      key: 'precio',
      label: 'Precio',
      render: (turno: TurnoFijoResponse) => (
        <span className="text-sm text-rp-muted">
          {turno.precioPactado != null ? formatearMoneda(turno.precioPactado) : 'Tarifa de la cancha'}
        </span>
      ),
    },
    {
      key: 'vigencia',
      label: 'Vigencia',
      render: (turno: TurnoFijoResponse) => (
        <div>
          <p className="text-xs text-rp-muted">
            desde {formatearFecha(turno.vigenteDesde)}
            {turno.vigenteHasta ? ` · hasta ${formatearFecha(turno.vigenteHasta)}` : ''}
          </p>
          <p className="text-xs text-rp-muted">
            {turno.generadoHasta ? `agendado hasta ${formatearFecha(turno.generadoHasta)}` : 'sin turnos agendados'}
          </p>
        </div>
      ),
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (turno: TurnoFijoResponse) => (
        <StatusBadge tone={turno.activo ? 'success' : 'neutral'}>{turno.activo ? 'Activo' : 'De baja'}</StatusBadge>
      ),
    },
  ] as Column<TurnoFijoResponse>[], [])

  return (
    <section>
      <AdminPageHeader
        title={<><CalendarSync size={26} />Turnos fijos</>}
        action={<>
          <Button size="sm" onClick={abrirCrear} disabled={canchasDelLugar.length === 0}><Plus size={16} />Nuevo turno fijo</Button>
          <Button size="sm" variant="subtle" onClick={regenerarTodos} disabled={generando}>
            <RefreshCw size={16} />{generando ? 'Agendando...' : 'Agendar pendientes'}
          </Button>
        </>}
      />

      <p className="mt-3 max-w-2xl text-sm text-rp-muted">
        El mismo cliente, la misma cancha, el mismo día y hora, todas las semanas. Los turnos se
        agendan solos con varias semanas de anticipación y ocupan la grilla como cualquier otro.
        Si una semana el cliente no viene, cancelá ese turno desde Turnos: no se vuelve a crear.
      </p>

      <div className="mt-4 grid gap-3 sm:max-w-xs">
        <Select label="Sucursal" value={lugarId ?? ''} onChange={(e) => setLugarId(e.target.value ? Number(e.target.value) : null)}>
          {lugares.map((lugar) => <option key={lugar.id} value={lugar.id}>{lugar.nombre}</option>)}
        </Select>
      </div>

      <div className="mt-4">
        <AdminTable
          columns={columnas}
          rows={elementos}
          getRowKey={(turno) => turno.id}
          isLoading={cargando}
          error={error}
          emptyTitle="No hay turnos fijos"
          emptyDescription="Cargá los abonos semanales del club y se agendan solos."
          actions={(turno) => (<>
            <button onClick={() => abrirEditar(turno)} className="flex size-11 items-center justify-center rounded-md lg:size-8 text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent"><Pencil size={15} /></button>
            {turno.activo && (
              <button onClick={() => setObjetivoBaja(turno)} className="flex size-11 items-center justify-center rounded-md lg:size-8 text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger"><Trash2 size={15} /></button>
            )}
          </>)}
        />
      </div>

      <Modal isOpen={modalAbierto} onClose={() => setModalAbierto(false)} onSubmit={guardar}
        title={objetivoEdicion ? 'Editar turno fijo' : 'Nuevo turno fijo'} size="md">
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Cancha" value={formulario.canchaId} onChange={(e) => setFormulario((f) => ({ ...f, canchaId: e.target.value }))}>
              {canchasDelLugar.map((cancha) => <option key={cancha.id} value={cancha.id}>{cancha.nombre}</option>)}
            </Select>
            <Select label="Día" value={formulario.diaSemana} onChange={(e) => setFormulario((f) => ({ ...f, diaSemana: e.target.value }))}>
              {DIAS.map((dia) => <option key={dia.valor} value={dia.valor}>{dia.nombre}</option>)}
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Hora de inicio" type="time" value={formulario.horaInicio} onChange={(e) => setFormulario((f) => ({ ...f, horaInicio: e.target.value }))} />
            <Select label="Duración" value={formulario.duracionMin} onChange={(e) => setFormulario((f) => ({ ...f, duracionMin: e.target.value }))}>
              <option value="60">1 hora</option>
              <option value="90">1 hora y media</option>
              <option value="120">2 horas</option>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Cliente" value={formulario.clienteNombre} onChange={(e) => setFormulario((f) => ({ ...f, clienteNombre: e.target.value }))} placeholder="Grupo de Gonzalo" />
            <Input label="Teléfono" value={formulario.clienteTelefono} onChange={(e) => setFormulario((f) => ({ ...f, clienteTelefono: e.target.value }))} placeholder="385 689 4061" />
          </div>

          <Input label="Precio pactado del turno" value={formulario.precioPactado}
            onChange={(e) => setFormulario((f) => ({ ...f, precioPactado: e.target.value }))}
            placeholder="45000" />
          <p className="-mt-2 text-[11px] text-rp-muted">Si lo dejás vacío se cobra la tarifa de la cancha.</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Desde" type="date" value={formulario.vigenteDesde} onChange={(e) => setFormulario((f) => ({ ...f, vigenteDesde: e.target.value }))} />
            <Input label="Hasta" type="date" value={formulario.vigenteHasta} onChange={(e) => setFormulario((f) => ({ ...f, vigenteHasta: e.target.value }))} />
          </div>
          <p className="-mt-2 text-[11px] text-rp-muted">Sin fecha de fin, el abono sigue hasta que lo des de baja.</p>

          <Input label="Notas" value={formulario.notas} onChange={(e) => setFormulario((f) => ({ ...f, notas: e.target.value }))} placeholder="Paga por mes" />

          {errorFormulario && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorFormulario}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setModalAbierto(false)} disabled={guardando}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar y agendar'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(objetivoBaja)}
        onClose={() => setObjetivoBaja(null)}
        onConfirm={darDeBaja}
        title="Dar de baja el turno fijo"
        description={`Se liberan todos los turnos futuros de ${objetivoBaja?.clienteNombre ?? ''}. Los turnos ya jugados no se tocan.`}
        isLoading={dandoDeBaja}
      />
    </section>
  )
}
