import { Pencil, Plus, RotateCcw, Trash2, Upload } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { categoriesApi } from '@/features/catalog/catalogApi'
import { playersApi } from '@/features/players/playersApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { useToast } from '@/shared/ui/Toast'
import { formatearFecha, formatearEnum } from '@/shared/lib/formatters'
import { ordenarCategorias } from '@/shared/lib/categorias'
import type { CategoriaResponse, Genero, JugadorRequest, JugadorResponse, PosicionJuego } from '@/shared/types/api'
import { ImportarCsvModal } from '@/pages/admin/ImportarCsvModal'
import { AdminPageHeader } from '@/shared/ui/AdminPageHeader'
import { AdminTable, type Column } from '@/shared/ui/AdminTable'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Pagination } from '@/shared/ui/Pagination'
import { Select } from '@/shared/ui/Select'
import { usePaginaEnUrl, useReiniciarPaginaAlFiltrar } from '@/shared/lib/paginacion'

const TAMANO_PAGINA = 8
const VACIO: JugadorRequest = { nombre: '', apellido: '', genero: 'MASCULINO', fotoUrl: null, categoriaId: null, fechaNacimiento: '', posicionJuego: null }

export default function PlayersPage() {
  const [jugadores, setJugadores] = useState<JugadorResponse[]>([])
  const [totalJugadores, setTotalJugadores] = useState(0)
  const [categorias, setCategorias] = useState<CategoriaResponse[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { success: avisoExito } = useToast()
  const [modalAbierto, setModalAbierto] = useState(false)
  const [objetivoEdicion, setObjetivoEdicion] = useState<JugadorResponse | null>(null)
  const [formulario, setFormulario] = useState<JugadorRequest>(VACIO)
  const [archivoFoto, setArchivoFoto] = useState<File | null>(null)
  const [cargandoFicha, setCargandoFicha] = useState(false)
  const [quitarFotoAlGuardar, setQuitarFotoAlGuardar] = useState(false)
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [objetivoEliminar, setObjetivoEliminar] = useState<JugadorResponse | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [idsSeleccionados, setIdsSeleccionados] = useState<Set<number>>(new Set())
  const [eliminarLoteAbierto, setEliminarLoteAbierto] = useState(false)
  const [eliminandoLote, setEliminandoLote] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [importarAbierto, setImportarAbierto] = useState(false)
  const [filtroGenero, setFiltroGenero] = useState<Genero>('MASCULINO')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [pagina, setPagina] = usePaginaEnUrl()
  const [verBajas, setVerBajas] = useState(false)
  const [reactivandoId, setReactivandoId] = useState<number | null>(null)
  const refScrollY = useRef(0)

  /**
   * Trae la página actual. La búsqueda y los filtros los resuelve el servidor: la pantalla
   * ya no se baja la tabla entera de jugadores para mostrar ocho filas.
   */
  /** Dar de baja era de ida: sin ver a los dados de baja no había forma de reactivarlos. */
  const reactivar = async (jugador: JugadorResponse) => {
    setReactivandoId(jugador.id)
    try {
      await playersApi.reactivar(jugador.id)
      cargar()
      avisoExito('Jugador reactivado')
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    } finally { setReactivandoId(null) }
  }

  const cargar = useCallback(() => {
    refScrollY.current = window.scrollY
    setCargando(true)
    Promise.all([
      playersApi.getPagina({
        busqueda,
        genero: filtroGenero,
        categoriaId: filtroCategoria ? Number(filtroCategoria) : null,
        incluirBajas: verBajas,
        pagina: pagina - 1,
        tamanio: TAMANO_PAGINA,
      }),
      categoriesApi.getAll(),
    ])
      .then(([paginaJugadores, datosCategorias]) => {
        setJugadores(paginaJugadores.contenido)
        setTotalJugadores(paginaJugadores.totalElementos)
        setCategorias(datosCategorias)
        setError(null)
      })
      .catch((errorCapturado: unknown) => setError(obtenerMensajeErrorApi(errorCapturado)))
      .finally(() => {
        setCargando(false)
        requestAnimationFrame(() => window.scrollTo(0, refScrollY.current))
      })
  }, [busqueda, filtroGenero, filtroCategoria, verBajas, pagina])

  // Se espera a que la persona termine de tipear: una consulta por tecla sería una
  // consulta a la base por cada letra del apellido.
  useEffect(() => {
    const temporizador = setTimeout(cargar, 250)
    return () => clearTimeout(temporizador)
  }, [cargar])

  const opcionesCategoria = useMemo(
    () => ordenarCategorias(categorias.filter((categoria) => categoria.genero === filtroGenero)),
    [categorias, filtroGenero],
  )

  const opcionesCategoriaFormulario = useMemo(
    () => ordenarCategorias(categorias.filter((categoria) => categoria.genero === formulario.genero)),
    [categorias, formulario.genero],
  )

  useReiniciarPaginaAlFiltrar(setPagina, [busqueda, filtroGenero, filtroCategoria, verBajas])

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

  // Lo que llega ya viene filtrado y ordenado por el servidor.
  const paginados = jugadores

  function abrirCrear() {
    setObjetivoEdicion(null)
    setFormulario(VACIO)
    setArchivoFoto(null)
    setCargandoFicha(false)
    setQuitarFotoAlGuardar(false)
    setErrorFormulario(null)
    setModalAbierto(true)
  }

  function abrirEditar(jugador: JugadorResponse) {
    setObjetivoEdicion(jugador)
    setFormulario({ nombre: jugador.nombre, apellido: jugador.apellido, genero: jugador.genero, fotoUrl: jugador.fotoUrl ?? null, categoriaId: jugador.categoriaId ?? null, fechaNacimiento: '', posicionJuego: jugador.posicionJuego ?? null })
    setArchivoFoto(null)
    setQuitarFotoAlGuardar(false)
    setErrorFormulario(null)
    setModalAbierto(true)
    setCargandoFicha(true)
    playersApi.getFicha(jugador.id)
      .then((ficha) => setFormulario((actual) => ({ ...actual, fechaNacimiento: ficha.fechaNacimiento ?? '' })))
      .catch(() => setErrorFormulario('No se pudo cargar la fecha de nacimiento; editala antes de guardar para no borrarla.'))
      .finally(() => setCargandoFicha(false))
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
    if (objetivoEdicion && cargandoFicha) { setErrorFormulario('Esperá a que termine de cargar el jugador.'); return }
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
      <AdminPageHeader
        title="Jugadores"
        action={(
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setImportarAbierto(true)}><Upload size={16} />Importar</Button>
            <Button size="sm" onClick={abrirCrear}><Plus size={16} />Nuevo jugador</Button>
          </div>
        )}
      />

      <ImportarCsvModal
        tipo="jugadores"
        abierto={importarAbierto}
        onClose={() => setImportarAbierto(false)}
        onImportado={cargar}
      />

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
        <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-rp-muted">
          <input type="checkbox" checked={verBajas} onChange={(e) => setVerBajas(e.target.checked)} />
          Ver dados de baja
        </label>
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
              <button onClick={() => abrirEditar(jugador)} className="flex size-11 items-center justify-center rounded-md lg:size-8 text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent"><Pencil size={15} /></button>
              {jugador.activo === false
                ? <button onClick={() => reactivar(jugador)} disabled={reactivandoId === jugador.id} title="Reactivar" className="flex size-11 items-center justify-center rounded-md lg:size-8 text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent disabled:opacity-40"><RotateCcw size={15} /></button>
                : <button onClick={() => setObjetivoEliminar(jugador)} title="Archivar" className="flex size-11 items-center justify-center rounded-md lg:size-8 text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger"><Trash2 size={15} /></button>}
            </>
          )}
        />
        <Pagination page={pagina} pageSize={TAMANO_PAGINA} total={totalJugadores} onPageChange={setPagina} />
      </div>

      <Modal isOpen={modalAbierto} onClose={cerrarModal} onSubmit={manejarGuardar} title={objetivoEdicion ? 'Editar jugador' : 'Nuevo jugador'} size="lg">
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
            <Select label="Posición" value={formulario.posicionJuego ?? ''} onChange={(event) => setFormulario((actual) => ({ ...actual, posicionJuego: event.target.value ? (event.target.value as PosicionJuego) : null }))} placeholder="Sin definir">
              <option value="DRIVE">Drive</option>
              <option value="REVES">Revés</option>
            </Select>
            <Input label="Fecha de nacimiento" type="date" value={formulario.fechaNacimiento ?? ''} onChange={(event) => setFormulario((actual) => ({ ...actual, fechaNacimiento: event.target.value }))} />
            <Input
              label="URL de foto"
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
              className="w-full min-w-0 max-w-full rounded-md border border-rp-border bg-rp-surface px-3 py-2 text-sm text-rp-muted"
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
            <Button type="submit" size="sm" disabled={guardando || cargandoFicha}>{guardando ? 'Guardando...' : 'Guardar'}</Button>
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
