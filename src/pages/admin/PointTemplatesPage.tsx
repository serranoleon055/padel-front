import { Minus, Pencil, Plus, Sigma, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { pointTemplatesApi } from '@/features/templates/templatesApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { useToast } from '@/shared/ui/Toast'
import { coincidePrefijoNombre } from '@/shared/lib/tournamentView'
import type { PlantillaPuntosRequest, PlantillaPuntosResponse, PlantillaPuntosRondaRequest } from '@/shared/types/api'
import { AdminPageHeader } from '@/shared/ui/AdminPageHeader'
import { AdminTable, type Column } from '@/shared/ui/AdminTable'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Pagination } from '@/shared/ui/Pagination'
import { StatusBadge } from '@/shared/ui/StatusBadge'

const TAMANO_PAGINA = 8
const RONDAS_POR_DEFECTO: PlantillaPuntosRondaRequest[] = [
  { nombreRonda: 'Grupos', puntosGanador: 10, puntosPerdedor: 5, orden: 1 },
  { nombreRonda: 'Octavos', puntosGanador: 20, puntosPerdedor: 10, orden: 2 },
  { nombreRonda: 'Cuartos', puntosGanador: 40, puntosPerdedor: 20, orden: 3 },
  { nombreRonda: 'Semifinal', puntosGanador: 70, puntosPerdedor: 40, orden: 4 },
  { nombreRonda: 'Final', puntosGanador: 100, puntosPerdedor: 70, orden: 5 },
]
const VACIO: PlantillaPuntosRequest = { nombre: '', descripcion: '', activo: true, rondas: RONDAS_POR_DEFECTO }

export default function PointTemplatesPage() {
  const [elementos, setElementos] = useState<PlantillaPuntosResponse[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { success: avisoExito } = useToast()
  const [modalAbierto, setModalAbierto] = useState(false)
  const [objetivoEdicion, setObjetivoEdicion] = useState<PlantillaPuntosResponse | null>(null)
  const [formulario, setFormulario] = useState<PlantillaPuntosRequest>(VACIO)
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
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

  function abrirCrear() { setObjetivoEdicion(null); setFormulario({ ...VACIO, rondas: RONDAS_POR_DEFECTO.map((r) => ({ ...r })) }); setErrorFormulario(null); setModalAbierto(true) }
  function abrirEditar(plantilla: PlantillaPuntosResponse) {
    setObjetivoEdicion(plantilla)
    setFormulario({
      nombre: plantilla.nombre,
      descripcion: plantilla.descripcion ?? '',
      activo: plantilla.activo,
      rondas: plantilla.rondas.map((r) => ({ nombreRonda: r.nombreRonda, puntosGanador: r.puntosGanador, puntosPerdedor: r.puntosPerdedor, orden: r.orden })),
    })
    setErrorFormulario(null)
    setModalAbierto(true)
  }
  function cerrarModal() { setModalAbierto(false); setErrorFormulario(null) }
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
    if (!formulario.nombre.trim()) { setErrorFormulario('El nombre es obligatorio.'); return }
    if (formulario.rondas.length === 0 || formulario.rondas.some((r) => !r.nombreRonda.trim())) { setErrorFormulario('Agregá al menos una ronda con nombre.'); return }
    setGuardando(true); setErrorFormulario(null)
    try {
      const datos = { ...formulario, rondas: formulario.rondas.map((r, i) => ({ ...r, puntosGanador: Number.isNaN(r.puntosGanador) ? 0 : r.puntosGanador, puntosPerdedor: Number.isNaN(r.puntosPerdedor) ? 0 : r.puntosPerdedor, orden: i + 1 })) }
      if (objetivoEdicion) await pointTemplatesApi.update(objetivoEdicion.id, datos)
      else await pointTemplatesApi.create(datos)
      cerrarModal(); cargar(); avisoExito(objetivoEdicion ? 'Plantilla actualizada' : 'Plantilla creada')
    } catch (e: unknown) { setErrorFormulario(obtenerMensajeErrorApi(e)) }
    finally { setGuardando(false) }
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
    { key: 'rondas', label: 'Rondas', render: (plantilla: PlantillaPuntosResponse) => <span className="text-sm text-rp-muted">{plantilla.rondas.length} configuraciones</span> },
    { key: 'detalle', label: 'Detalle', render: (plantilla: PlantillaPuntosResponse) => <span className="line-clamp-1 text-sm text-rp-muted">{plantilla.rondas.map((r) => r.nombreRonda).join(' · ')}</span> },
    { key: 'estado', label: 'Estado', render: (plantilla: PlantillaPuntosResponse) => <StatusBadge tone={plantilla.activo ? 'success' : 'neutral'}>{plantilla.activo ? 'Activa' : 'Inactiva'}</StatusBadge> },
  ] as Column<PlantillaPuntosResponse>[], [])

  return (
    <section>
      <AdminPageHeader title="Plantillas de puntos" action={<Button size="sm" onClick={abrirCrear}><Plus size={16} />Nueva plantilla</Button>} />

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

      <Modal isOpen={modalAbierto} onClose={cerrarModal} onSubmit={manejarGuardar} title={objetivoEdicion ? 'Editar plantilla' : 'Nueva plantilla'} size="lg">
        <div className="grid gap-4">
          <Input label="Nombre" value={formulario.nombre} onChange={(e) => setFormulario((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ranking estándar" />
          <Input label="Descripción" value={formulario.descripcion ?? ''} onChange={(e) => setFormulario((f) => ({ ...f, descripcion: e.target.value }))} placeholder="Puntos habituales por ronda" />
          <label className="flex items-center gap-3 text-sm font-bold text-rp-muted"><input type="checkbox" checked={formulario.activo} onChange={(e) => setFormulario((f) => ({ ...f, activo: e.target.checked }))} className="size-4 accent-rp-accent" />Activa</label>

          <div className="grid gap-3">
            {formulario.rondas.map((fila, i) => (
              <div key={i} className="grid items-end gap-3 rounded-lg border border-rp-border bg-rp-bg/55 p-3 sm:grid-cols-[1fr_95px_95px_36px]">
                <Input label="Ronda" value={fila.nombreRonda} onChange={(e) => actualizarFila(i, { nombreRonda: e.target.value })} placeholder="Final" />
                <Input label="Ganador" type="number" min={0} value={Number.isNaN(fila.puntosGanador) ? '' : fila.puntosGanador} onChange={(e) => actualizarFila(i, { puntosGanador: e.target.value === '' ? NaN : Number(e.target.value) })} />
                <Input label="Perdedor" type="number" min={0} value={Number.isNaN(fila.puntosPerdedor) ? '' : fila.puntosPerdedor} onChange={(e) => actualizarFila(i, { puntosPerdedor: e.target.value === '' ? NaN : Number(e.target.value) })} />
                <button type="button" onClick={() => quitarFila(i)} className="mb-0.5 flex size-9 self-end items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger"><Minus size={15} /></button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={agregarFila} className="self-start"><Plus size={15} />Agregar ronda</Button>
          </div>

          {errorFormulario && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorFormulario}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={cerrarModal} disabled={guardando}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={Boolean(objetivoEliminar)} onClose={() => setObjetivoEliminar(null)} onConfirm={manejarEliminar}
        title="Eliminar plantilla" description={`¿Desactivás "${objetivoEliminar?.nombre}"?`} isLoading={eliminando} />
    </section>
  )
}
