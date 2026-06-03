import { Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { formatTemplatesApi } from '@/features/templates/templatesApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { useToast } from '@/shared/ui/Toast'
import { formatearEnum } from '@/shared/lib/formatters'
import { coincidePrefijoNombre } from '@/shared/lib/tournamentView'
import type { FormatoTorneo, PlantillaFormatoRequest, PlantillaFormatoResponse, TipoSorteo } from '@/shared/types/api'
import { AdminTable, type Column } from '@/shared/ui/AdminTable'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Pagination } from '@/shared/ui/Pagination'
import { Select } from '@/shared/ui/Select'
import { StatusBadge } from '@/shared/ui/StatusBadge'

const TAMANO_PAGINA = 8
const VACIO: PlantillaFormatoRequest = {
  nombre: '',
  descripcion: '',
  formatoTorneo: 'MINITORNEO',
  tipoSorteo: 'ALEATORIO',
  cantidadParejasObjetivo: 12,
  cantidadGrupos: 4,
  parejasPorGrupo: 3,
  avanzanPorGrupo: 2,
  incluyeFaseGrupos: true,
  incluyeEliminacion: true,
  activo: true,
}

function aNumero(value: string) {
  return value ? Number(value) : null
}

function normalizarFormulario(formulario: PlantillaFormatoRequest): PlantillaFormatoRequest {
  if (formulario.formatoTorneo === 'ELIMINACION_DIRECTA') {
    return { ...formulario, incluyeFaseGrupos: false, incluyeEliminacion: true, cantidadGrupos: null, parejasPorGrupo: null, avanzanPorGrupo: null }
  }
  if (!formulario.incluyeFaseGrupos) {
    return { ...formulario, cantidadGrupos: null, parejasPorGrupo: null, avanzanPorGrupo: null }
  }
  if (!formulario.incluyeEliminacion) {
    return { ...formulario, avanzanPorGrupo: null }
  }
  return formulario
}

function presetFormato(formatoTorneo: FormatoTorneo): PlantillaFormatoRequest {
  if (formatoTorneo === 'ELIMINACION_DIRECTA') {
    return { ...VACIO, formatoTorneo, cantidadParejasObjetivo: 16, cantidadGrupos: null, parejasPorGrupo: null, avanzanPorGrupo: null, incluyeFaseGrupos: false, incluyeEliminacion: true }
  }
  if (formatoTorneo === 'LIGA') {
    return { ...VACIO, formatoTorneo, cantidadParejasObjetivo: null, cantidadGrupos: 1, parejasPorGrupo: null, avanzanPorGrupo: null, incluyeFaseGrupos: true, incluyeEliminacion: false }
  }
  if (formatoTorneo === 'TORNEO_LARGO') {
    return { ...VACIO, formatoTorneo, cantidadParejasObjetivo: null, cantidadGrupos: null, parejasPorGrupo: null, avanzanPorGrupo: 2, incluyeFaseGrupos: true, incluyeEliminacion: true }
  }
  return { ...VACIO, formatoTorneo }
}

export default function FormatTemplatesPage() {
  const [elementos, setElementos] = useState<PlantillaFormatoResponse[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { success: avisoExito } = useToast()
  const [modalAbierto, setModalAbierto] = useState(false)
  const [objetivoEdicion, setObjetivoEdicion] = useState<PlantillaFormatoResponse | null>(null)
  const [formulario, setFormulario] = useState<PlantillaFormatoRequest>({ ...VACIO })
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [objetivoEliminar, setObjetivoEliminar] = useState<PlantillaFormatoResponse | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const refScrollY = useRef(0)

  function cargar() {
    refScrollY.current = window.scrollY
    setCargando(true)
    formatTemplatesApi.getAll(false)
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

  function abrirCrear() {
    setObjetivoEdicion(null)
    setFormulario({ ...VACIO })
    setErrorFormulario(null)
    setModalAbierto(true)
  }

  function abrirEditar(plantilla: PlantillaFormatoResponse) {
    setObjetivoEdicion(plantilla)
    setFormulario({
      nombre: plantilla.nombre,
      descripcion: plantilla.descripcion ?? '',
      formatoTorneo: plantilla.formatoTorneo,
      tipoSorteo: plantilla.tipoSorteo,
      cantidadParejasObjetivo: plantilla.cantidadParejasObjetivo ?? null,
      cantidadGrupos: plantilla.cantidadGrupos ?? null,
      parejasPorGrupo: plantilla.parejasPorGrupo ?? null,
      avanzanPorGrupo: plantilla.avanzanPorGrupo ?? null,
      incluyeFaseGrupos: plantilla.incluyeFaseGrupos,
      incluyeEliminacion: plantilla.incluyeEliminacion,
      activo: plantilla.activo,
    })
    setErrorFormulario(null)
    setModalAbierto(true)
  }

  function cerrarModal() {
    setModalAbierto(false)
    setErrorFormulario(null)
  }

  async function manejarGuardar() {
    if (!formulario.nombre.trim()) { setErrorFormulario('El nombre es obligatorio.'); return }
    const datos = normalizarFormulario(formulario)
    if (!datos.incluyeFaseGrupos && !datos.incluyeEliminacion) { setErrorFormulario('La plantilla debe incluir fase de grupos o eliminación.'); return }
    if (datos.incluyeFaseGrupos && datos.incluyeEliminacion && !datos.avanzanPorGrupo) { setErrorFormulario('Indicá cuántas parejas avanzan por grupo.'); return }
    setGuardando(true)
    setErrorFormulario(null)
    try {
      if (objetivoEdicion) await formatTemplatesApi.update(objetivoEdicion.id, datos)
      else await formatTemplatesApi.create(datos)
      cerrarModal(); cargar(); avisoExito(objetivoEdicion ? 'Plantilla actualizada' : 'Plantilla creada')
    } catch (e: unknown) {
      setErrorFormulario(obtenerMensajeErrorApi(e))
    } finally {
      setGuardando(false)
    }
  }

  async function manejarEliminar() {
    if (!objetivoEliminar) return
    setEliminando(true)
    try {
      await formatTemplatesApi.remove(objetivoEliminar.id)
      setObjetivoEliminar(null); cargar(); avisoExito('Plantilla eliminada')
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
      setObjetivoEliminar(null)
    } finally {
      setEliminando(false)
    }
  }

  const columnas = useMemo(() => [
    { key: 'nombre', label: 'Nombre', render: (plantilla: PlantillaFormatoResponse) => <div className="flex items-center gap-2"><Layers size={14} className="text-rp-accent" /><span className="text-sm font-bold text-rp-text">{plantilla.nombre}</span></div> },
    { key: 'formato', label: 'Formato', render: (plantilla: PlantillaFormatoResponse) => <span className="text-sm text-rp-muted">{formatearEnum(plantilla.formatoTorneo)}</span> },
    { key: 'parejas', label: 'Parejas', render: (plantilla: PlantillaFormatoResponse) => <span className="text-sm text-rp-muted">{plantilla.cantidadParejasObjetivo ?? 'Auto'} parejas</span> },
    { key: 'estructura', label: 'Estructura', render: (plantilla: PlantillaFormatoResponse) => <span className="text-sm text-rp-muted">{[plantilla.incluyeFaseGrupos ? 'Grupos' : null, plantilla.incluyeEliminacion ? 'Eliminación' : null].filter(Boolean).join(' + ')}</span> },
    { key: 'estado', label: 'Estado', render: (plantilla: PlantillaFormatoResponse) => <StatusBadge tone={plantilla.activo ? 'success' : 'neutral'}>{plantilla.activo ? 'Activa' : 'Inactiva'}</StatusBadge> },
  ] as Column<PlantillaFormatoResponse>[], [])

  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-rp-accent">Admin</p>
          <h1 className="mt-2 text-3xl font-black text-rp-text">Plantillas de formato</h1>
        </div>
        <Button size="sm" onClick={abrirCrear}><Plus size={16} />Nueva plantilla</Button>
      </div>

      <div className="mt-4 w-64 max-w-full">
        <Input placeholder="Buscar por nombre..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </div>

      <div className="mt-4">
        <AdminTable columns={columnas} rows={paginados} getRowKey={(plantilla) => plantilla.id} isLoading={cargando} error={error} emptyTitle="No hay plantillas de formato"
          actions={(plantilla) => (<>
            <button onClick={() => abrirEditar(plantilla)} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent"><Pencil size={15} /></button>
            <button onClick={() => setObjetivoEliminar(plantilla)} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger"><Trash2 size={15} /></button>
          </>)}
        />
        <Pagination page={pagina} pageSize={TAMANO_PAGINA} total={filtrados.length} onPageChange={setPagina} />
      </div>

      <Modal isOpen={modalAbierto} onClose={cerrarModal} title={objetivoEdicion ? 'Editar plantilla' : 'Nueva plantilla'} size="lg">
        <div className="grid gap-4">
          <Input label="Nombre" value={formulario.nombre} onChange={(e) => setFormulario((f) => ({ ...f, nombre: e.target.value }))} placeholder="12 parejas - 4 grupos" />
          <Input label="Descripción" value={formulario.descripcion ?? ''} onChange={(e) => setFormulario((f) => ({ ...f, descripcion: e.target.value }))} placeholder="Fase de grupos y eliminación posterior" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Formato" value={formulario.formatoTorneo} onChange={(e) => setFormulario((f) => ({ ...presetFormato(e.target.value as FormatoTorneo), nombre: f.nombre, descripcion: f.descripcion, tipoSorteo: f.tipoSorteo, activo: f.activo }))}>
              <option value="MINITORNEO">Minitorneo</option>
              <option value="TORNEO_LARGO">Torneo largo</option>
              <option value="LIGA">Liga</option>
              <option value="ELIMINACION_DIRECTA">Eliminación directa</option>
            </Select>
            <Select label="Tipo de sorteo" value={formulario.tipoSorteo} onChange={(e) => setFormulario((f) => ({ ...f, tipoSorteo: e.target.value as TipoSorteo }))}>
              <option value="ALEATORIO">Aleatorio</option>
              <option value="CABEZAS_SERIE">Cabezas de serie</option>
              <option value="COMBINADO">Combinado</option>
            </Select>
          </div>

          <div className="rounded-lg border border-rp-border bg-rp-bg/55 p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-rp-accent">Estructura del formato</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="flex items-center gap-3 text-sm font-bold text-rp-muted">
                <input type="checkbox" checked={formulario.incluyeFaseGrupos} disabled={formulario.formatoTorneo === 'ELIMINACION_DIRECTA'} onChange={(e) => setFormulario((f) => normalizarFormulario({ ...f, incluyeFaseGrupos: e.target.checked }))} className="size-4 accent-rp-accent" />
                Fase de grupos
              </label>
              <label className="flex items-center gap-3 text-sm font-bold text-rp-muted">
                <input type="checkbox" checked={formulario.incluyeEliminacion} disabled={formulario.formatoTorneo === 'ELIMINACION_DIRECTA'} onChange={(e) => setFormulario((f) => normalizarFormulario({ ...f, incluyeEliminacion: e.target.checked }))} className="size-4 accent-rp-accent" />
                Eliminación
              </label>
              <label className="flex items-center gap-3 text-sm font-bold text-rp-muted">
                <input type="checkbox" checked={formulario.activo} onChange={(e) => setFormulario((f) => ({ ...f, activo: e.target.checked }))} className="size-4 accent-rp-accent" />
                Activa
              </label>
            </div>
            <div className={`mt-4 grid items-end gap-4 ${formulario.incluyeFaseGrupos ? 'sm:grid-cols-4' : 'sm:grid-cols-1'}`}>
              <Input label="Cantidad parejas" type="number" min={2} placeholder="Automático" value={formulario.cantidadParejasObjetivo ?? ''} onChange={(e) => setFormulario((f) => ({ ...f, cantidadParejasObjetivo: aNumero(e.target.value) }))} />
              {formulario.incluyeFaseGrupos ? (
                <>
                  <Input label="Grupos" type="number" min={formulario.incluyeEliminacion ? 2 : 1} placeholder="Automático" value={formulario.cantidadGrupos ?? ''} onChange={(e) => setFormulario((f) => ({ ...f, cantidadGrupos: aNumero(e.target.value) }))} />
                  <Input label="Parejas/grupo" type="number" min={2} placeholder="Automático" value={formulario.parejasPorGrupo ?? ''} onChange={(e) => setFormulario((f) => ({ ...f, parejasPorGrupo: aNumero(e.target.value) }))} />
                  {formulario.incluyeEliminacion ? <Input label="Avanzan/grupo" type="number" min={1} value={formulario.avanzanPorGrupo ?? ''} onChange={(e) => setFormulario((f) => ({ ...f, avanzanPorGrupo: aNumero(e.target.value) }))} /> : null}
                </>
              ) : null}
            </div>
          </div>

          {errorFormulario && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorFormulario}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={cerrarModal} disabled={guardando}>Cancelar</Button>
            <Button size="sm" onClick={manejarGuardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={Boolean(objetivoEliminar)} onClose={() => setObjetivoEliminar(null)} onConfirm={manejarEliminar}
        title="Eliminar plantilla" description={`¿Desactivás "${objetivoEliminar?.nombre}"?`} isLoading={eliminando} />
    </section>
  )
}
