import { ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'

import { categoriesApi, placesApi, seasonsApi } from '@/features/catalog/catalogApi'
import { formatTemplatesApi, pointTemplatesApi } from '@/features/templates/templatesApi'
import { tournamentsApi } from '@/features/tournaments/tournamentsApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { formatearEnum } from '@/shared/lib/formatters'
import type {
  CategoriaResponse,
  ConfiguracionPuntosResponse,
  Genero,
  LugarResponse,
  PlantillaFormatoResponse,
  PlantillaPuntosResponse,
  TemporadaResponse,
  TorneoRequest,
  TorneoResponse,
} from '@/shared/types/api'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { Select } from '@/shared/ui/Select'
import { StatusMessage } from '@/shared/ui/StatusMessage'

const POR_DEFECTO: TorneoRequest = {
  nombre: '',
  descripcion: null,
  imagenUrl: null,
  cupoMaximoParejas: null,
  cuposPorCategoria: {},
  formato: 'MINITORNEO',
  fechaInicio: '',
  fechaFin: null,
  esMixto: false,
  sumaPuntosRanking: true,
  plantillaFormatoId: null,
  plantillaPuntosId: null,
  cantidadParejasObjetivo: null,
  cantidadGrupos: null,
  parejasPorGrupo: null,
  avanzanPorGrupo: null,
  incluyeFaseGrupos: true,
  incluyeEliminacion: true,
  mejorDeSets: 3,
  tipoSorteo: 'ALEATORIO',
  temporadaId: null,
  lugarId: null,
  categoriaIds: [],
  configuracionPuntos: [],
}

export default function TournamentFormPage() {
  const { torneoId } = useParams()
  const navegar = useNavigate()
  const estaEditando = torneoId !== 'nuevo' && Boolean(torneoId)
  const idNumerico = estaEditando ? Number(torneoId) : null

  const [formulario, setFormulario] = useState<TorneoRequest>(POR_DEFECTO)
  const [categorias, setCategorias] = useState<CategoriaResponse[]>([])
  const [filtroGeneroCategoria, setFiltroGeneroCategoria] = useState<Genero>('MASCULINO')
  const [lugares, setLugares] = useState<LugarResponse[]>([])
  const [temporadas, setTemporadas] = useState<TemporadaResponse[]>([])
  const [plantillasFormato, setPlantillasFormato] = useState<PlantillaFormatoResponse[]>([])
  const [plantillasPuntos, setPlantillasPuntos] = useState<PlantillaPuntosResponse[]>([])
  const [cargandoMeta, setCargandoMeta] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null)
  const [archivoImagen, setArchivoImagen] = useState<File | null>(null)

  useEffect(() => {
    setCargandoMeta(true)
    const peticiones: Promise<unknown>[] = [
      categoriesApi.getAll(),
      placesApi.getAll(),
      seasonsApi.getAll(),
      formatTemplatesApi.getAll(true),
      pointTemplatesApi.getAll(true),
    ]
    if (estaEditando && idNumerico) peticiones.push(tournamentsApi.getById(idNumerico))

    Promise.all(peticiones)
      .then((resultados) => {
        const [categoriasData, lugaresData, temporadasData, plantillasFormatoData, plantillasPuntosData] = resultados as [
          CategoriaResponse[],
          LugarResponse[],
          TemporadaResponse[],
          PlantillaFormatoResponse[],
          PlantillaPuntosResponse[],
        ]
        setCategorias(categoriasData)
        setLugares(lugaresData)
        setTemporadas(temporadasData)
        setPlantillasFormato(plantillasFormatoData)
        setPlantillasPuntos(plantillasPuntosData)

        if (estaEditando && resultados[5]) {
          const torneo = resultados[5] as TorneoResponse
          setFormulario({
            nombre: torneo.nombre,
            descripcion: torneo.descripcion ?? null,
            imagenUrl: torneo.imagenUrl ?? null,
            cupoMaximoParejas: torneo.cupoMaximoParejas ?? null,
            cuposPorCategoria: torneo.cuposPorCategoria ?? {},
            formato: torneo.formato,
            fechaInicio: torneo.fechaInicio ?? '',
            fechaFin: torneo.fechaFin ?? null,
            esMixto: torneo.esMixto,
            sumaPuntosRanking: torneo.sumaPuntosRanking,
            plantillaFormatoId: torneo.plantillaFormatoId ?? null,
            plantillaPuntosId: torneo.plantillaPuntosId ?? null,
            cantidadParejasObjetivo: torneo.cantidadParejasObjetivo ?? null,
            cantidadGrupos: torneo.cantidadGrupos ?? null,
            parejasPorGrupo: torneo.parejasPorGrupo ?? null,
            avanzanPorGrupo: torneo.avanzanPorGrupo ?? null,
            incluyeFaseGrupos: torneo.incluyeFaseGrupos,
            incluyeEliminacion: torneo.incluyeEliminacion,
            mejorDeSets: torneo.mejorDeSets ?? 3,
            tipoSorteo: torneo.tipoSorteo,
            temporadaId: torneo.temporadaId ?? null,
            lugarId: torneo.lugarId ?? null,
            categoriaIds: torneo.categorias.map((categoria) => categoria.id),
            configuracionPuntos: (torneo.configuracionPuntos ?? []).map((cp: ConfiguracionPuntosResponse) => ({
              nombreRonda: cp.nombreRonda,
              puntosGanador: cp.puntosGanador,
              puntosPerdedor: cp.puntosPerdedor,
              orden: cp.orden,
            })),
          })
        }
      })
      .catch((e: unknown) => setErrorFormulario(obtenerMensajeErrorApi(e)))
      .finally(() => setCargandoMeta(false))
  }, [estaEditando, idNumerico])

  const temporadasActivas = useMemo(() => temporadas.filter((temporada) => temporada.activa), [temporadas])
  const categoriasVisibles = categorias
    .filter((categoria) => categoria.genero === filtroGeneroCategoria)
    .sort((a, b) => a.nivel - b.nivel)
  const plantillaFormatoSeleccionada = plantillasFormato.find((plantilla) => plantilla.id === formulario.plantillaFormatoId)
  const plantillaPuntosSeleccionada = plantillasPuntos.find((plantilla) => plantilla.id === formulario.plantillaPuntosId)

  function alternarCategoria(id: number) {
    setFormulario((f) => {
      const seQuita = f.categoriaIds.includes(id)
      const cupos = { ...(f.cuposPorCategoria ?? {}) }
      if (seQuita) delete cupos[id]
      return {
        ...f,
        categoriaIds: seQuita ? f.categoriaIds.filter((catId) => catId !== id) : [...f.categoriaIds, id],
        cuposPorCategoria: cupos,
      }
    })
  }

  function establecerCupoCategoria(id: number, valor: number | null) {
    setFormulario((f) => {
      const cupos = { ...(f.cuposPorCategoria ?? {}) }
      if (valor && valor > 0) cupos[id] = valor
      else delete cupos[id]
      return { ...f, cuposPorCategoria: cupos }
    })
  }

  function aplicarPlantillaFormato(plantillaId: string) {
    const plantilla = plantillasFormato.find((item) => item.id === Number(plantillaId))
    setFormulario((f) => plantilla ? ({
      ...f,
      plantillaFormatoId: plantilla.id,
      formato: plantilla.formatoTorneo,
      tipoSorteo: plantilla.tipoSorteo,
      cantidadParejasObjetivo: plantilla.cantidadParejasObjetivo ?? null,
      cantidadGrupos: plantilla.cantidadGrupos ?? null,
      parejasPorGrupo: plantilla.parejasPorGrupo ?? null,
      avanzanPorGrupo: plantilla.avanzanPorGrupo ?? null,
      incluyeFaseGrupos: plantilla.incluyeFaseGrupos,
      incluyeEliminacion: plantilla.incluyeEliminacion,
    }) : ({ ...f, plantillaFormatoId: null }))
  }

  function aplicarPlantillaPuntos(plantillaId: string) {
    const plantilla = plantillasPuntos.find((item) => item.id === Number(plantillaId))
    setFormulario((f) => ({ ...f, plantillaPuntosId: plantilla?.id ?? null, configuracionPuntos: [] }))
  }

  async function manejarEnviar() {
    if (!formulario.nombre.trim()) { setErrorFormulario('El nombre es obligatorio.'); return }
    if (!formulario.fechaInicio) { setErrorFormulario('La fecha de inicio es obligatoria.'); return }
    if (formulario.categoriaIds.length === 0) { setErrorFormulario('Seleccioná al menos una categoría.'); return }
    if (plantillasFormato.length > 0 && !formulario.plantillaFormatoId) { setErrorFormulario('Seleccioná una plantilla de formato activa.'); return }
    if (formulario.sumaPuntosRanking && plantillasPuntos.length > 0 && !formulario.plantillaPuntosId) { setErrorFormulario('Seleccioná una plantilla de puntos activa.'); return }

    setEnviando(true)
    setErrorFormulario(null)
    try {
      const datos: TorneoRequest = {
        ...formulario,
        configuracionPuntos: formulario.plantillaPuntosId ? [] : formulario.configuracionPuntos,
      }
      const guardado = estaEditando && idNumerico ? await tournamentsApi.update(idNumerico, datos) : await tournamentsApi.create(datos)
      if (archivoImagen) await tournamentsApi.uploadImage(guardado.id, archivoImagen)
      navegar('/admin/torneos')
    } catch (e: unknown) {
      setErrorFormulario(obtenerMensajeErrorApi(e))
    } finally {
      setEnviando(false)
    }
  }

  if (cargandoMeta) return <section className="py-8"><StatusMessage type="loading" title="Cargando formulario..." /></section>

  return (
    <section>
      <Button variant="ghost" size="sm" asChild>
        <NavLink to="/admin/torneos"><ArrowLeft size={16} />Volver a torneos</NavLink>
      </Button>

      <div className="mt-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-rp-accent">Admin</p>
        <h1 className="mt-2 text-2xl font-black text-rp-text sm:text-3xl">{estaEditando ? 'Editar torneo' : 'Nuevo torneo'}</h1>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-5">
          <fieldset className="rounded-lg border border-rp-border bg-rp-surface/82 p-5">
            <legend className="px-1 text-xs font-black uppercase tracking-[0.14em] text-rp-accent">Datos básicos</legend>
            <div className="mt-4 grid gap-4">
              <Input label="Nombre del torneo" value={formulario.nombre} onChange={(e) => setFormulario((f) => ({ ...f, nombre: e.target.value }))} placeholder="Copa Santiago 2026" />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-rp-muted">Descripción (opcional)</label>
                <textarea
                  rows={2}
                  value={formulario.descripcion ?? ''}
                  onChange={(e) => setFormulario((f) => ({ ...f, descripcion: e.target.value || null }))}
                  placeholder="Información sobre el torneo, premios, requisitos..."
                  className="rounded-md border border-rp-border bg-rp-bg px-3 py-2 text-sm text-rp-text focus:border-rp-accent focus:outline-none resize-none"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="URL de imagen (opcional, alternativa)" value={formulario.imagenUrl ?? ''} onChange={(e) => setFormulario((f) => ({ ...f, imagenUrl: e.target.value || null }))} placeholder="https://..." />
                <label className="flex flex-col gap-2 text-sm font-bold text-rp-text">
                  Subir imagen (opcional)
                  <input type="file" accept="image/jpeg,image/png" onChange={(e) => setArchivoImagen(e.target.files?.[0] ?? null)} className="rounded-md border border-rp-border bg-rp-surface px-3 py-2 text-sm text-rp-muted" />
                </label>
              </div>
              <p className="text-xs leading-5 text-rp-muted">El cupo máximo de parejas se define por categoría más abajo. JPG o PNG, ideal cuadrada y menor a 2 MB.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Fecha de inicio" type="date" value={formulario.fechaInicio} onChange={(e) => setFormulario((f) => ({ ...f, fechaInicio: e.target.value }))} />
                <Input label="Fecha de fin (opcional)" type="date" value={formulario.fechaFin ?? ''} onChange={(e) => setFormulario((f) => ({ ...f, fechaFin: e.target.value || null }))} />
              </div>
            </div>
          </fieldset>

          <fieldset className="rounded-lg border border-rp-border bg-rp-surface/82 p-5">
            <legend className="px-1 text-xs font-black uppercase tracking-[0.14em] text-rp-accent">Lugar y temporada</legend>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Select label="Lugar" value={formulario.lugarId?.toString() ?? ''} onChange={(e) => setFormulario((f) => ({ ...f, lugarId: e.target.value ? Number(e.target.value) : null }))} placeholder="Sin lugar">
                {lugares.map((lugar) => <option key={lugar.id} value={lugar.id}>{lugar.nombre}</option>)}
              </Select>
              <Select label="Temporada" value={formulario.temporadaId?.toString() ?? ''} onChange={(e) => setFormulario((f) => ({ ...f, temporadaId: e.target.value ? Number(e.target.value) : null }))} placeholder="Sin temporada">
                {temporadasActivas.map((temporada) => <option key={temporada.id} value={temporada.id}>{temporada.nombre}</option>)}
              </Select>
            </div>
          </fieldset>

          <fieldset className="rounded-lg border border-rp-border bg-rp-surface/82 p-5">
            <legend className="px-1 text-xs font-black uppercase tracking-[0.14em] text-rp-accent">Plantillas</legend>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Select label="Plantilla de formato" value={formulario.plantillaFormatoId?.toString() ?? ''} onChange={(e) => aplicarPlantillaFormato(e.target.value)} placeholder="Seleccionar...">
                {plantillasFormato.map((plantilla) => <option key={plantilla.id} value={plantilla.id}>{plantilla.nombre}</option>)}
              </Select>
              <Select label="Plantilla de puntos" value={formulario.plantillaPuntosId?.toString() ?? ''} onChange={(e) => aplicarPlantillaPuntos(e.target.value)} placeholder={formulario.sumaPuntosRanking ? 'Seleccionar...' : 'No suma ranking'}>
                {plantillasPuntos.map((plantilla) => <option key={plantilla.id} value={plantilla.id}>{plantilla.nombre}</option>)}
              </Select>
            </div>
            <div className="mt-4 grid gap-3 text-xs text-rp-muted sm:grid-cols-2">
              <ResumenPlantilla title="Formato" lineas={plantillaFormatoSeleccionada ? [
                formatearEnum(plantillaFormatoSeleccionada.formatoTorneo),
                formatearEnum(plantillaFormatoSeleccionada.tipoSorteo),
                plantillaFormatoSeleccionada.incluyeFaseGrupos ? 'Con fase de grupos' : 'Sin fase de grupos',
                plantillaFormatoSeleccionada.incluyeEliminacion ? 'Con eliminación' : 'Sin eliminación',
              ] : ['Sin plantilla seleccionada']} />
              <ResumenPlantilla title="Puntos" lineas={plantillaPuntosSeleccionada ? plantillaPuntosSeleccionada.rondas.map((r) => `${r.nombreRonda}: ${r.puntosGanador}/${r.puntosPerdedor}`) : ['Sin plantilla seleccionada']} />
            </div>
          </fieldset>

          <fieldset className="rounded-lg border border-rp-border bg-rp-surface/82 p-5">
            <legend className="px-1 text-xs font-black uppercase tracking-[0.14em] text-rp-accent">Opciones mínimas</legend>
            <div className="mt-4">
              <Select label="Formato de sets" value={String(formulario.mejorDeSets ?? 3)} onChange={(e) => setFormulario((f) => ({ ...f, mejorDeSets: Number(e.target.value) }))}>
                <option value="3">Mejor de 3 sets (2 sets para ganar)</option>
                <option value="1">A 1 set (minitorneo / partido rápido)</option>
              </Select>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3 text-sm font-bold text-rp-muted">
                <input type="checkbox" checked={formulario.sumaPuntosRanking} onChange={(e) => setFormulario((f) => ({ ...f, sumaPuntosRanking: e.target.checked, plantillaPuntosId: e.target.checked ? f.plantillaPuntosId : null }))} className="size-4 accent-rp-accent" />
                Suma puntos al ranking
              </label>
              <label className="flex cursor-pointer items-center gap-3 text-sm font-bold text-rp-muted">
                <input type="checkbox" checked={formulario.esMixto} onChange={(e) => setFormulario((f) => ({ ...f, esMixto: e.target.checked }))} className="size-4 accent-rp-accent" />
                Torneo mixto
              </label>
            </div>
          </fieldset>
        </div>

        <div className="flex flex-col gap-5">
          <fieldset className="rounded-lg border border-rp-border bg-rp-surface/82 p-5">
            <legend className="px-1 text-xs font-black uppercase tracking-[0.14em] text-rp-accent">Categorías</legend>
            <p className="mt-2 text-xs text-rp-muted">Seleccioná las categorías que participarán.</p>
            <div className="mt-4">
              <Select value={filtroGeneroCategoria} onChange={(e) => setFiltroGeneroCategoria(e.target.value as Genero)}>
                <option value="MASCULINO">Masculino</option>
                <option value="FEMENINO">Femenino</option>
              </Select>
            </div>
            <div className="mt-4 grid gap-2">
              {categorias.length === 0 ? (
                <p className="text-sm text-rp-muted">No hay categorías. Creá alguna primero.</p>
              ) : categoriasVisibles.length === 0 ? (
                <p className="text-sm text-rp-muted">No hay categorías para este género.</p>
              ) : categoriasVisibles.map((categoria) => {
                const seleccionada = formulario.categoriaIds.includes(categoria.id)
                return (
                  <div key={categoria.id} className="flex flex-wrap items-center gap-3 rounded-md border border-rp-border p-4 transition hover:border-rp-accent/50">
                    <label className="flex min-w-0 flex-1 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1">
                      <input type="checkbox" checked={seleccionada} onChange={() => alternarCategoria(categoria.id)} className="size-4 shrink-0 accent-rp-accent" />
                      <span className="text-sm font-bold text-rp-text">{categoria.nombre}</span>
                      <span className="whitespace-nowrap text-xs text-rp-muted">Nivel {categoria.nivel} · {categoria.genero === 'MASCULINO' ? 'Masc.' : 'Fem.'}</span>
                    </label>
                    {seleccionada && (
                      <Input type="number" min={2} placeholder="Cupo" className="w-24 shrink-0" value={formulario.cuposPorCategoria?.[categoria.id]?.toString() ?? ''} onChange={(e) => establecerCupoCategoria(categoria.id, e.target.value ? Number(e.target.value) : null)} />
                    )}
                  </div>
                )
              })}
            </div>
          </fieldset>

          <div className="flex flex-col gap-3">
            {errorFormulario && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorFormulario}</p>}
            <Button onClick={manejarEnviar} disabled={enviando} className="w-full">
              {enviando ? 'Guardando...' : estaEditando ? 'Guardar cambios' : 'Crear torneo'}
            </Button>
            <Button variant="ghost" asChild className="w-full">
              <NavLink to="/admin/torneos">Cancelar</NavLink>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

function ResumenPlantilla({ lineas, title }: { lineas: string[]; title: string }) {
  return (
    <div className="rounded-lg border border-rp-border bg-rp-bg/55 p-3">
      <strong className="block text-xs uppercase tracking-[0.12em] text-rp-accent">{title}</strong>
      <div className="mt-2 flex flex-wrap gap-2">
        {lineas.map((linea) => <span key={linea} className="rounded-md bg-rp-surface px-2 py-1 font-bold text-rp-muted">{linea}</span>)}
      </div>
    </div>
  )
}
