import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { categoriesApi } from '@/features/catalog/catalogApi'
import { playersApi } from '@/features/players/playersApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { useToast } from '@/shared/ui/Toast'
import { formatearFecha, formatearEnum } from '@/shared/lib/formatters'
import { nombreCompletoEmpiezaCon } from '@/shared/lib/tournamentView'
import { ordenarCategorias } from '@/shared/lib/categorias'
import type { CategoriaResponse, Genero, JugadorRequest, JugadorResponse } from '@/shared/types/api'
import { AdminTable, type Column } from '@/shared/ui/AdminTable'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Pagination } from '@/shared/ui/Pagination'
import { Select } from '@/shared/ui/Select'

const TAMANO_PAGINA = 8
const VACIO: JugadorRequest = { nombre: '', apellido: '', genero: 'MASCULINO', fotoUrl: null, categoriaId: null, fechaNacimiento: '' }

export default function PlayersPage() {
  const [jugadores, setJugadores] = useState<JugadorResponse[]>([])
  const [categorias, setCategorias] = useState<CategoriaResponse[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { success: avisoExito } = useToast()
  const [modalAbierto, setModalAbierto] = useState(false)
  const [objetivoEdicion, setObjetivoEdicion] = useState<JugadorResponse | null>(null)
  const [formulario, setFormulario] = useState<JugadorRequest>(VACIO)
  const [archivoFoto, setArchivoFoto] = useState<File | null>(null)
  const [quitarFotoAlGuardar, setQuitarFotoAlGuardar] = useState(false)
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [objetivoEliminar, setObjetivoEliminar] = useState<JugadorResponse | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [idsSeleccionados, setIdsSeleccionados] = useState<Set<number>>(new Set())
  const [eliminarLoteAbierto, setEliminarLoteAbierto] = useState(false)
  const [eliminandoLote, setEliminandoLote] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroGenero, setFiltroGenero] = useState<Genero>('MASCULINO')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [pagina, setPagina] = useState(1)
  const refScrollY = useRef(0)

  function cargar() {
    refScrollY.current = window.scrollY
    setCargando(true)
    Promise.all([playersApi.getAll(), categoriesApi.getAll()])
      .then(([datosJugadores, datosCategorias]) => { setJugadores(datosJugadores); setCategorias(datosCategorias); setError(null) })
      .catch((errorCapturado: unknown) => setError(obtenerMensajeErrorApi(errorCapturado)))
      .finally(() => {
        setCargando(false)
        requestAnimationFrame(() => window.scrollTo(0, refScrollY.current))
      })
  }

  useEffect(cargar, [])

  const opcionesCategoria = useMemo(
    () => ordenarCategorias(categorias.filter((categoria) => categoria.genero === filtroGenero)),
    [categorias, filtroGenero],
  )

  const opcionesCategoriaFormulario = useMemo(
    () => ordenarCategorias(categorias.filter((categoria) => categoria.genero === formulario.genero)),
    [categorias, formulario.genero],
  )

  useEffect(() => {
    setPagina(1)
  }, [busqueda, filtroGenero, filtroCategoria])

  useEffect(() => {
    if (filtroCategoria && !opcionesCategoria.some((categoria) => categoria.id === Number(filtroCategoria))) {
      setFiltroCategoria('')
    }
  }, [opcionesCategoria, filtroCategoria])

  useEffect(() => {
    if (formulario.categoriaId && !opcionesCategoriaFormulario.some((categoria) => categoria.id === formulario.categoriaId)) {
      setFormulario((actual) => ({ ...actual, categoriaId: null }))
    }
  }, [formulario.categoriaId, opcionesCategoriaFormulario])

  const filtrados = useMemo(() => jugadores.filter((jugador) => {
    const coincideNombre = nombreCompletoEmpiezaCon(jugador.nombre, jugador.apellido, busqueda)
    const coincideGenero = jugador.genero === filtroGenero
    const coincideCategoria = !filtroCategoria || jugador.categoriaId === Number(filtroCategoria)
    return coincideNombre && coincideGenero && coincideCategoria
  }).sort((a, b) => `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`, 'es', { sensitivity: 'base' })), [filtroCategoria, filtroGenero, jugadores, busqueda])

  const paginados = filtrados.slice((pagina - 1) * TAMANO_PAGINA, pagina * TAMANO_PAGINA)

  function abrirCrear() {
    setObjetivoEdicion(null)
    setFormulario(VACIO)
    setArchivoFoto(null)
    setQuitarFotoAlGuardar(false)
    setErrorFormulario(null)
    setModalAbierto(true)
  }

  function abrirEditar(jugador: JugadorResponse) {
    setObjetivoEdicion(jugador)
    setFormulario({ nombre: jugador.nombre, apellido: jugador.apellido, genero: jugador.genero, fotoUrl: jugador.fotoUrl ?? null, categoriaId: jugador.categoriaId ?? null, fechaNacimiento: '' })
    setArchivoFoto(null)
    setQuitarFotoAlGuardar(false)
    setErrorFormulario(null)
    setModalAbierto(true)
    playersApi.getFicha(jugador.id)
      .then((ficha) => setFormulario((actual) => ({ ...actual, fechaNacimiento: ficha.fechaNacimiento ?? '' })))
      .catch(() => {})
  }

  function cerrarModal() {
    setModalAbierto(false)
    setErrorFormulario(null)
  }

  async function manejarQuitarFoto() {
    setArchivoFoto(null)
    setQuitarFotoAlGuardar(Boolean(objetivoEdicion?.fotoUrl))
    setFormulario((actual) => ({ ...actual, fotoUrl: null }))
  }

  async function manejarGuardar() {
    if (!formulario.nombre.trim() || !formulario.apellido.trim()) { setErrorFormulario('Nombre y apellido son obligatorios.'); return }
    setGuardando(true)
    setErrorFormulario(null)
    try {
      const datos: JugadorRequest = {
        ...formulario,
        fechaNacimiento: formulario.fechaNacimiento ? formulario.fechaNacimiento : null,
      }
      if (objetivoEdicion) {
        if (quitarFotoAlGuardar) await playersApi.removePhoto(objetivoEdicion.id)
        const guardado = await playersApi.update(objetivoEdicion.id, datos)
        if (archivoFoto) await playersApi.uploadPhoto(guardado.id, archivoFoto)
      } else {
        const guardado = await playersApi.create(datos)
        if (archivoFoto) await playersApi.uploadPhoto(guardado.id, archivoFoto)
      }
      cerrarModal()
      cargar()
      avisoExito(objetivoEdicion ? 'Jugador actualizado' : 'Jugador creado')
    } catch (errorCapturado: unknown) {
      setErrorFormulario(obtenerMensajeErrorApi(errorCapturado))
    } finally {
      setGuardando(false)
    }
  }

  async function manejarEliminar() {
    if (!objetivoEliminar) return
    setEliminando(true)
    try {
      await playersApi.remove(objetivoEliminar.id)
      setObjetivoEliminar(null)
      cargar()
      avisoExito('Jugador archivado')
    } catch (errorCapturado: unknown) {
      setError(obtenerMensajeErrorApi(errorCapturado))
      setObjetivoEliminar(null)
    } finally {
      setEliminando(false)
    }
  }

  async function manejarEliminarLote() {
    setEliminandoLote(true)
    try {
      await playersApi.removeBatch(Array.from(idsSeleccionados))
      setIdsSeleccionados(new Set())
      setEliminarLoteAbierto(false)
      cargar()
    } catch (errorCapturado: unknown) {
      setError(obtenerMensajeErrorApi(errorCapturado))
      setEliminarLoteAbierto(false)
    } finally {
      setEliminandoLote(false)
    }
  }

  function alternarSeleccion(id: number) {
    setIdsSeleccionados((previo) => {
      const siguiente = new Set(previo)
      if (siguiente.has(id)) {
        siguiente.delete(id)
      } else {
        siguiente.add(id)
      }
      return siguiente
    })
  }

  function seleccionarTodo() {
    const idsPagina = paginados.map((jugador) => jugador.id)
    const todaPaginaSeleccionada = idsPagina.length > 0 && idsPagina.every((id) => idsSeleccionados.has(id))
    setIdsSeleccionados(todaPaginaSeleccionada ? new Set() : new Set(idsPagina))
  }

  const columnas = useMemo(() => [
    { key: 'nombre', label: 'Jugador', render: (jugador: JugadorResponse) => <div><p className="text-sm font-bold text-rp-text">{jugador.nombre} {jugador.apellido}</p></div> },
    { key: 'genero', label: 'Género', render: (jugador: JugadorResponse) => <span className="text-sm text-rp-muted">{formatearEnum(jugador.genero)}</span> },
    { key: 'cat', label: 'Categoría', render: (jugador: JugadorResponse) => <span className="text-sm text-rp-muted">{jugador.categoriaNombre ?? '-'}</span> },
    { key: 'fechaRegistro', label: 'Fecha Registro', render: (jugador: JugadorResponse) => <span className="text-sm text-rp-muted">{formatearFecha(jugador.fechaRegistro)}</span> },
  ] as Column<JugadorResponse>[], [])

  const obtenerClaveFila = useCallback((jugador: JugadorResponse) => jugador.id, [])

  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-rp-accent">Admin</p>
          <h1 className="mt-2 text-3xl font-black text-rp-text">Jugadores</h1>
        </div>
        <Button size="sm" onClick={abrirCrear}><Plus size={16} />Nuevo jugador</Button>
      </div>

      <div className="rp-toolbar">
        <Input placeholder="Buscar por nombre..." value={busqueda} onChange={(event) => setBusqueda(event.target.value)} />
        <Select value={filtroGenero} onChange={(event) => { setFiltroGenero(event.target.value as Genero); setFiltroCategoria('') }}>
          <option value="MASCULINO">Masculino</option>
          <option value="FEMENINO">Femenino</option>
        </Select>
        <Select value={filtroCategoria} onChange={(event) => setFiltroCategoria(event.target.value)}>
          <option value="">Todas las categorías</option>
          {opcionesCategoria.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}
        </Select>
        {idsSeleccionados.size > 0 && (
          <Button size="sm" variant="subtle" onClick={() => setEliminarLoteAbierto(true)}>
            <Trash2 size={15} />Archivar seleccionados ({idsSeleccionados.size})
          </Button>
        )}
      </div>

      <div className="mt-4">
        <AdminTable
          columns={columnas}
          rows={paginados}
          getRowKey={obtenerClaveFila}
          isLoading={cargando}
          error={error}
          emptyTitle="No hay jugadores"
          emptyDescription="Creá el primero con el botón de arriba."
          selectedIds={idsSeleccionados}
          onToggleSelect={alternarSeleccion}
          onSelectAll={seleccionarTodo}
          actions={(jugador) => (
            <>
              <button onClick={() => abrirEditar(jugador)} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent"><Pencil size={15} /></button>
              <button onClick={() => setObjetivoEliminar(jugador)} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger"><Trash2 size={15} /></button>
            </>
          )}
        />
        <Pagination page={pagina} pageSize={TAMANO_PAGINA} total={filtrados.length} onPageChange={setPagina} />
      </div>

      <Modal isOpen={modalAbierto} onClose={cerrarModal} title={objetivoEdicion ? 'Editar jugador' : 'Nuevo jugador'} size="lg">
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Nombre" value={formulario.nombre} onChange={(event) => setFormulario((actual) => ({ ...actual, nombre: event.target.value }))} placeholder="Carlos" />
            <Input label="Apellido" value={formulario.apellido} onChange={(event) => setFormulario((actual) => ({ ...actual, apellido: event.target.value }))} placeholder="García" />
            <Select label="Género" value={formulario.genero} onChange={(event) => setFormulario((actual) => ({ ...actual, genero: event.target.value as Genero, categoriaId: null }))}>
              <option value="MASCULINO">Masculino</option>
              <option value="FEMENINO">Femenino</option>
            </Select>
            <Select label="Categoría" value={formulario.categoriaId?.toString() ?? ''} onChange={(event) => setFormulario((actual) => ({ ...actual, categoriaId: event.target.value ? Number(event.target.value) : null }))} placeholder="Sin categoría">
              {opcionesCategoriaFormulario.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}
            </Select>
            <Input label="Fecha de nacimiento (opcional)" type="date" value={formulario.fechaNacimiento ?? ''} onChange={(event) => setFormulario((actual) => ({ ...actual, fechaNacimiento: event.target.value }))} />
            <Input
              label="URL de foto (opcional)"
              type="url"
              value={formulario.fotoUrl?.startsWith('/uploads/') ? '' : formulario.fotoUrl ?? ''}
              onChange={(event) => setFormulario((actual) => ({ ...actual, fotoUrl: event.target.value || null }))}
              placeholder="https://..."
            />
          </div>
          <label className="flex flex-col gap-2 text-sm font-bold text-rp-text">
            Subir foto
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={(event) => { setArchivoFoto(event.target.files?.[0] ?? null); setQuitarFotoAlGuardar(false) }}
              className="rounded-md border border-rp-border bg-rp-surface px-3 py-2 text-sm text-rp-muted"
            />
          </label>
          <p className="text-xs leading-5 text-rp-muted">Para nube, usá este flujo de subida: JPG o PNG cuadrada, ideal 800x800 px y menor a 2 MB. El backend la redimensiona y guarda la URL final en el jugador.</p>
          {formulario.fotoUrl?.startsWith('/uploads/') ? <p className="text-xs font-bold text-rp-accent">Este jugador ya tiene una foto cargada desde archivo.</p> : null}
          {(formulario.fotoUrl || archivoFoto) ? (
            <Button variant="ghost" size="sm" className="self-start text-rp-danger" onClick={manejarQuitarFoto} disabled={guardando}>
              Quitar foto
            </Button>
          ) : null}
          {errorFormulario && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorFormulario}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={cerrarModal} disabled={guardando}>Cancelar</Button>
            <Button size="sm" onClick={manejarGuardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={Boolean(objetivoEliminar)} onClose={() => setObjetivoEliminar(null)} onConfirm={manejarEliminar}
        title="Archivar jugador" description={`¿Archivás a ${objetivoEliminar?.nombre} ${objetivoEliminar?.apellido}? Queda fuera de las listas; su historial se conserva.`} isLoading={eliminando} />

      <ConfirmDialog isOpen={eliminarLoteAbierto} onClose={() => setEliminarLoteAbierto(false)} onConfirm={manejarEliminarLote}
        title="Archivar seleccionados" description={`¿Archivás ${idsSeleccionados.size} jugador(es)?`} isLoading={eliminandoLote} />
    </section>
  )
}
