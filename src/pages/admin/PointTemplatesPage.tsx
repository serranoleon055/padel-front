import { Minus, Pencil, Plus, Sigma, Trash2 } from 'lucide-react'
import { memo, useEffect, useMemo, useRef, useState } from 'react'

import { pointTemplatesApi } from '@/features/templates/templatesApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { useToast } from '@/shared/ui/Toast'
import { formatearEnum } from '@/shared/lib/formatters'
import { coincidePrefijoNombre } from '@/shared/lib/tournamentView'
import type { FormatoTorneo, PlantillaPuntosRequest, PlantillaPuntosResponse, PlantillaPuntosRondaRequest } from '@/shared/types/api'
import { AdminPageHeader } from '@/shared/ui/AdminPageHeader'
import { AdminTable, type Column } from '@/shared/ui/AdminTable'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Pagination } from '@/shared/ui/Pagination'
import { Select } from '@/shared/ui/Select'
import { StatusBadge } from '@/shared/ui/StatusBadge'

const TAMANO_PAGINA = 8
const RONDAS_DISPONIBLES = [
  { valor: 'Grupos', etiqueta: 'Fase de grupos / Liga' },
  { valor: 'Treintaidosavos', etiqueta: 'Treintaidosavos de final (64 parejas)' },
  { valor: 'Dieciseisavos', etiqueta: 'Dieciseisavos de final (32 parejas)' },
  { valor: 'Octavos', etiqueta: 'Octavos de final' },
  { valor: 'Cuartos', etiqueta: 'Cuartos de final' },
  { valor: 'Semifinal', etiqueta: 'Semifinal' },
  { valor: 'Final', etiqueta: 'Final' },
]
const RONDAS_POR_DEFECTO: PlantillaPuntosRondaRequest[] = [
  { nombreRonda: 'Grupos', puntosGanador: 10, puntosPerdedor: 5, orden: 1 },
  { nombreRonda: 'Octavos', puntosGanador: 20, puntosPerdedor: 10, orden: 2 },
  { nombreRonda: 'Cuartos', puntosGanador: 40, puntosPerdedor: 20, orden: 3 },
  { nombreRonda: 'Semifinal', puntosGanador: 70, puntosPerdedor: 40, orden: 4 },
  { nombreRonda: 'Final', puntosGanador: 100, puntosPerdedor: 70, orden: 5 },
]

function formularioDesde(plantilla: PlantillaPuntosResponse | null): PlantillaPuntosRequest {
  if (!plantilla) {
    return { nombre: '', descripcion: '', formatoTorneo: null, activo: true, rondas: RONDAS_POR_DEFECTO.map((r) => ({ ...r })) }
  }
  return {
    nombre: plantilla.nombre,
    descripcion: plantilla.descripcion ?? '',
    formatoTorneo: plantilla.formatoTorneo ?? null,
    activo: plantilla.activo,
    rondas: plantilla.rondas.map((r) => ({ nombreRonda: r.nombreRonda, puntosGanador: r.puntosGanador, puntosPerdedor: r.puntosPerdedor, orden: r.orden })),
  }
}

const PlantillaPuntosModal = memo(function PlantillaPuntosModal({ abierto, objetivo, onCerrar, onGuardar }: {
  abierto: boolean
  objetivo: PlantillaPuntosResponse | null
  onCerrar: () => void
  onGuardar: (datos: PlantillaPuntosRequest) => Promise<void>
}) {
  const [formulario, setFormulario] = useState<PlantillaPuntosRequest>(() => formularioDesde(null))
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    setFormulario(formularioDesde(objetivo))
    setError(null)
  }, [abierto, objetivo])

  function agregarFila() {
    setFormulario((f) => ({ ...f, rondas: [...f.rondas, { nombreRonda: '', puntosGanador: NaN, puntosPerdedor: NaN, orden: f.rondas.length + 1 }] }))
  }
  function quitarFila(index: number) {
    setFormulario((f) => ({ ...f, rondas: f.rondas.filter((_, i) => i !== index).map((r, i) => ({ ...r, orden: i + 1 })) }))
  }
  function actualizarFila(index: number, parcial: Partial<PlantillaPuntosRondaRequest>) {
    setFormulario((f) => ({ ...f, rondas: f.rondas.map((r, i) => i === index ? { ...r, ...parcial } : r) }))
  }

  async function manejarGuardar() {
    if (!formulario.nombre.trim()) { setError('El nombre es obligatorio.'); return }
    if (formulario.rondas.length === 0 || formulario.rondas.some((r) => !r.nombreRonda.trim())) { setError('Agregá al menos una ronda con nombre.'); return }
    setGuardando(true); setError(null)
    try {
      const datos = { ...formulario, rondas: formulario.rondas.map((r, i) => ({ ...r, puntosGanador: Number.isNaN(r.puntosGanador) ? 0 : r.puntosGanador, puntosPerdedor: Number.isNaN(r.puntosPerdedor) ? 0 : r.puntosPerdedor, orden: i + 1 })) }
      await onGuardar(datos)
    } catch (e: unknown) { setError(obtenerMensajeErrorApi(e)) }
    finally { setGuardando(false) }
  }

  return (
    <Modal isOpen={abierto} onClose={onCerrar} onSubmit={manejarGuardar} title={objetivo ? 'Editar plantilla' : 'Nueva plantilla'} size="lg">
      <div className="grid gap-4">
        <Input label="Nombre" value={formulario.nombre} onChange={(e) => setFormulario((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ranking estándar" />
        <Input label="Descripción" value={formulario.descripcion ?? ''} onChange={(e) => setFormulario((f) => ({ ...f, descripcion: e.target.value }))} placeholder="Puntos habituales por ronda" />
        <Select label="Formato al que aplica" value={formulario.formatoTorneo ?? ''} onChange={(e) => setFormulario((f) => ({ ...f, formatoTorneo: e.target.value ? (e.target.value as FormatoTorneo) : null }))}>
          <option value="">Todos los formatos</option>
          <option value="MINITORNEO">Minitorneo</option>
          <option value="TORNEO_LARGO">Torneo largo</option>
          <option value="LIGA">Liga</option>
          <option value="ELIMINACION_DIRECTA">Eliminación directa</option>
        </Select>
        <label className="flex items-center gap-3 text-sm font-bold text-rp-muted"><input type="checkbox" checked={formulario.activo} onChange={(e) => setFormulario((f) => ({ ...f, activo: e.target.checked }))} className="size-4 accent-rp-accent" />Activa</label>

        <div className="grid gap-3">
          {formulario.rondas.map((fila, i) => (
            <div key={i} className="grid items-end gap-3 rounded-lg border border-rp-border bg-rp-bg/55 p-3 sm:grid-cols-[1fr_95px_95px_36px]">
              <Select label="Ronda" value={fila.nombreRonda} onChange={(e) => actualizarFila(i, { nombreRonda: e.target.value })}>
                <option value="">Elegir...</option>
                {RONDAS_DISPONIBLES.map((ronda) => <option key={ronda.valor} value={ronda.valor}>{ronda.etiqueta}</option>)}
                {fila.nombreRonda && !RONDAS_DISPONIBLES.some((ronda) => ronda.valor === fila.nombreRonda) && (
                  <option value={fila.nombreRonda}>{fila.nombreRonda} (personalizada)</option>
                )}
              </Select>
              <Input label="Ganador" type="number" min={0} value={Number.isNaN(fila.puntosGanador) ? '' : fila.puntosGanador} onChange={(e) => actualizarFila(i, { puntosGanador: e.target.value === '' ? NaN : Number(e.target.value) })} />
              <Input label="Perdedor" type="number" title="Puede ser negativo para penalizar la derrota" value={Number.isNaN(fila.puntosPerdedor) ? '' : fila.puntosPerdedor} onChange={(e) => actualizarFila(i, { puntosPerdedor: e.target.value === '' ? NaN : Number(e.target.value) })} />
              <button type="button" onClick={() => quitarFila(i)} className="mb-0.5 flex size-9 self-end items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger"><Minus size={15} /></button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={agregarFila} className="self-start"><Plus size={15} />Agregar ronda</Button>
        </div>

        {error && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onCerrar} disabled={guardando}>Cancelar</Button>
          <Button type="submit" size="sm" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </div>
    </Modal>
  )
})

export default function PointTemplatesPage() {
  const [elementos, setElementos] = useState<PlantillaPuntosResponse[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { success: avisoExito } = useToast()
  const [modalAbierto, setModalAbierto] = useState(false)
  const [objetivoEdicion, setObjetivoEdicion] = useState<PlantillaPuntosResponse | null>(null)
  const [objetivoEliminar, setObjetivoEliminar] = useState<PlantillaPuntosResponse | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const refScrollY = useRef(0)

  function cargar() {
    refScrollY.current = window.scrollY
    setCargando(true)
    pointTemplatesApi.getAll(false)
      .then((datos) => { setElementos(datos); setError(null) })
      .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
      .finally(() => {
        setCargando(false)
        requestAnimationFrame(() => window.scrollTo(0, refScrollY.current))
      })
  }

  useEffect(cargar, [])
  useEffect(() => setPagina(1), [busqueda])

  const filtrados = useMemo(() => elementos
    .filter((plantilla) => coincidePrefijoNombre(plantilla.nombre, busqueda))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })), [elementos, busqueda])
  const paginados = filtrados.slice((pagina - 1) * TAMANO_PAGINA, pagina * TAMANO_PAGINA)

  function abrirCrear() { setObjetivoEdicion(null); setModalAbierto(true) }
  function abrirEditar(plantilla: PlantillaPuntosResponse) { setObjetivoEdicion(plantilla); setModalAbierto(true) }

  async function guardar(datos: PlantillaPuntosRequest) {
    if (objetivoEdicion) await pointTemplatesApi.update(objetivoEdicion.id, datos)
    else await pointTemplatesApi.create(datos)
    setModalAbierto(false)
    cargar()
    avisoExito(objetivoEdicion ? 'Plantilla actualizada' : 'Plantilla creada')
  }

  async function manejarEliminar() {
    if (!objetivoEliminar) return
    setEliminando(true)
    try { await pointTemplatesApi.remove(objetivoEliminar.id); setObjetivoEliminar(null); cargar(); avisoExito('Plantilla eliminada') }
    catch (e: unknown) { setError(obtenerMensajeErrorApi(e)); setObjetivoEliminar(null) }
    finally { setEliminando(false) }
  }

  const columnas = useMemo(() => [
    { key: 'nombre', label: 'Nombre', render: (plantilla: PlantillaPuntosResponse) => <div className="flex items-center gap-2"><Sigma size={14} className="text-rp-accent" /><span className="text-sm font-bold text-rp-text">{plantilla.nombre}</span></div> },
    { key: 'formato', label: 'Formato', render: (plantilla: PlantillaPuntosResponse) => <span className="text-sm text-rp-muted">{plantilla.formatoTorneo ? formatearEnum(plantilla.formatoTorneo) : 'Todos'}</span> },
    { key: 'rondas', label: 'Rondas', render: (plantilla: PlantillaPuntosResponse) => <span className="text-sm text-rp-muted">{plantilla.rondas.length} configuraciones</span> },
    { key: 'detalle', label: 'Detalle', render: (plantilla: PlantillaPuntosResponse) => <span className="line-clamp-1 text-sm text-rp-muted">{plantilla.rondas.map((r) => r.nombreRonda).join(' · ')}</span> },
    { key: 'estado', label: 'Estado', render: (plantilla: PlantillaPuntosResponse) => <StatusBadge tone={plantilla.activo ? 'success' : 'neutral'}>{plantilla.activo ? 'Activa' : 'Inactiva'}</StatusBadge> },
  ] as Column<PlantillaPuntosResponse>[], [])

  return (
    <section>
      <AdminPageHeader title="Plantillas de puntos" action={<Button size="sm" onClick={abrirCrear}><Plus size={16} />Nueva plantilla</Button>} />

      <div className="mt-4 rounded-lg border border-rp-border bg-rp-surface/82 p-3 text-xs leading-relaxed text-rp-muted">
        <p className="font-black text-rp-accent">Qué rondas poner según el torneo</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li><strong className="text-rp-text">Liga:</strong> solo <strong className="text-rp-text">Fase de grupos / Liga</strong>.</li>
          <li><strong className="text-rp-text">Grupos + eliminación:</strong> Fase de grupos + las rondas de eliminación (Dieciseisavos, Octavos, Cuartos, Semifinal, Final).</li>
          <li><strong className="text-rp-text">Eliminación directa:</strong> solo las rondas de eliminación.</li>
        </ul>
        <p className="mt-1">Tip: poné <strong className="text-rp-text">todas</strong> las rondas posibles. El torneo usa solo las que efectivamente juega según la cantidad de parejas; las que sobran no molestan. El perdedor puede ser <strong className="text-rp-text">negativo</strong> (penaliza), pero el ranking nunca baja de 0.</p>
      </div>

      <div className="mt-4 w-full sm:w-64">
        <Input placeholder="Buscar por nombre..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </div>

      <div className="mt-4">
        <AdminTable columns={columnas} rows={paginados} getRowKey={(plantilla) => plantilla.id} isLoading={cargando} error={error} emptyTitle="No hay plantillas de puntos"
          actions={(plantilla) => (<>
            <button onClick={() => abrirEditar(plantilla)} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent"><Pencil size={15} /></button>
            <button onClick={() => setObjetivoEliminar(plantilla)} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger"><Trash2 size={15} /></button>
          </>)}
        />
        <Pagination page={pagina} pageSize={TAMANO_PAGINA} total={filtrados.length} onPageChange={setPagina} />
      </div>

      <PlantillaPuntosModal abierto={modalAbierto} objetivo={objetivoEdicion} onCerrar={() => setModalAbierto(false)} onGuardar={guardar} />

      <ConfirmDialog isOpen={Boolean(objetivoEliminar)} onClose={() => setObjetivoEliminar(null)} onConfirm={manejarEliminar}
        title="Eliminar plantilla" description={`¿Desactivás "${objetivoEliminar?.nombre}"?`} isLoading={eliminando} />
    </section>
  )
}
