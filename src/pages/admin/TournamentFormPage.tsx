import { ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'

import { categoriesApi, placesApi, seasonsApi } from '@/features/catalog/catalogApi'
import { formatTemplatesApi, pointTemplatesApi } from '@/features/templates/templatesApi'
import { tournamentsApi } from '@/features/tournaments/tournamentsApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { formatearEnum, formatearMoneda } from '@/shared/lib/formatters'
import type {
  CategoriaResponse,
  ConfiguracionCategoriaTorneoRequest,
  FormatoTorneo,
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
import { SegmentedToggle } from '@/shared/ui/SegmentedToggle'
import { Select } from '@/shared/ui/Select'
import { StatusMessage } from '@/shared/ui/StatusMessage'

const POR_DEFECTO: TorneoRequest = {
  nombre: '',
  descripcion: null,
  imagenUrl: null,
  cupoMaximoParejas: null,
  costoInscripcionJugador: null,
  premioAcumulado: null,
  seniaPorcentaje: null,
  cuposPorCategoria: {},
  formato: 'MINITORNEO',
  fechaInicio: '',
  fechaFin: null,
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
  configuracionesCategoria: [],
}

function configCategoriaPorDefecto(categoriaId: number): ConfiguracionCategoriaTorneoRequest {
  return {
    categoriaId,
    formato: 'MINITORNEO',
    plantillaFormatoId: null,
    plantillaPuntosId: null,
    cantidadParejasObjetivo: null,
    cantidadGrupos: null,
    parejasPorGrupo: null,
    avanzanPorGrupo: null,
    incluyeFaseGrupos: true,
    incluyeEliminacion: true,
    tipoSorteo: 'ALEATORIO',
    mejorDeSets: 3,
    cupo: null,
    configuracionPuntos: [],
  }
}

function normalizarRondaSimple(nombre: string): string {
  const texto = (nombre ?? '').toLowerCase()
  if (texto.includes('grupo') || texto.includes('fecha') || texto.includes('jornada')) return 'GRUPOS'
  if (texto.includes('treintaidosavo') || texto.includes('32avo') || texto.includes('ronda de 64')) return 'TREINTAIDOSAVOS'
  if (texto.includes('dieciseisavo') || texto.includes('16avo') || texto.includes('ronda de 32')) return 'DIECISEISAVOS'
  if (texto.includes('octavo') || texto.includes('ronda de 16')) return 'OCTAVOS'
  if (texto.includes('cuarto') || texto.includes('ronda de 8')) return 'CUARTOS'
  if (texto.includes('semi')) return 'SEMIFINAL'
  if (texto.includes('final')) return 'FINAL'
  return texto
}

function aplicarFormatoAConfig(
  config: ConfiguracionCategoriaTorneoRequest,
  plantilla: PlantillaFormatoResponse | undefined,
): ConfiguracionCategoriaTorneoRequest {
  if (!plantilla) return { ...config, plantillaFormatoId: null }
  const esLiga = plantilla.formatoTorneo === 'LIGA'
  return {
    ...config,
    plantillaFormatoId: plantilla.id,
    formato: plantilla.formatoTorneo,
    tipoSorteo: plantilla.tipoSorteo,
    cantidadParejasObjetivo: plantilla.cantidadParejasObjetivo ?? null,
    cantidadGrupos: plantilla.cantidadGrupos ?? null,
    parejasPorGrupo: plantilla.parejasPorGrupo ?? null,
    avanzanPorGrupo: plantilla.avanzanPorGrupo ?? null,
    incluyeFaseGrupos: esLiga ? true : plantilla.incluyeFaseGrupos,
    incluyeEliminacion: esLiga ? false : plantilla.incluyeEliminacion,
    mejorDeSets: plantilla.formatoTorneo === 'MINITORNEO' ? 1 : 3,
    cupo: plantilla.cantidadParejasObjetivo ?? null,
  }
}

export default function TournamentFormPage() {
  const { torneoId } = useParams()
  const navegar = useNavigate()
  const estaEditando = torneoId !== 'nuevo' && Boolean(torneoId)
  const idNumerico = estaEditando ? Number(torneoId) : null
  const volverDestino = estaEditando && idNumerico ? `/admin/torneos/${idNumerico}` : '/admin/torneos'

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
  const [puedeEditarConfig, setPuedeEditarConfig] = useState(true)
  const [reaplicando, setReaplicando] = useState(false)
  const [mensajeReaplicar, setMensajeReaplicar] = useState<string | null>(null)

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
          setPuedeEditarConfig(torneo.estado === 'BORRADOR' || torneo.estado === 'INSCRIPCION')
          const configs: ConfiguracionCategoriaTorneoRequest[] = (torneo.configuracionesCategoria ?? []).map((config) => ({
            categoriaId: config.categoriaId,
            formato: config.formato,
            plantillaFormatoId: config.plantillaFormatoId ?? null,
            plantillaPuntosId: config.plantillaPuntosId ?? null,
            cantidadParejasObjetivo: config.cantidadParejasObjetivo ?? null,
            cantidadGrupos: config.cantidadGrupos ?? null,
            parejasPorGrupo: config.parejasPorGrupo ?? null,
            avanzanPorGrupo: config.avanzanPorGrupo ?? null,
            incluyeFaseGrupos: config.incluyeFaseGrupos,
            incluyeEliminacion: config.incluyeEliminacion,
            tipoSorteo: config.tipoSorteo,
            mejorDeSets: config.mejorDeSets ?? 3,
            cupo: config.cupo ?? null,
            configuracionPuntos: (config.configuracionPuntos ?? []).map((cp) => ({
              nombreRonda: cp.nombreRonda,
              puntosGanador: cp.puntosGanador,
              puntosPerdedor: cp.puntosPerdedor,
              orden: cp.orden,
            })),
          }))
          setFormulario({
            nombre: torneo.nombre,
            descripcion: torneo.descripcion ?? null,
            imagenUrl: torneo.imagenUrl ?? null,
            cupoMaximoParejas: torneo.cupoMaximoParejas ?? null,
            costoInscripcionJugador: torneo.costoInscripcionJugador ?? null,
            premioAcumulado: torneo.premioAcumulado ?? null,
            seniaPorcentaje: torneo.seniaPorcentaje ?? null,
            cuposPorCategoria: torneo.cuposPorCategoria ?? {},
            formato: torneo.formato,
            fechaInicio: torneo.fechaInicio ?? '',
            fechaFin: torneo.fechaFin ?? null,
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
            categoriaIds: configs.length > 0 ? configs.map((c) => c.categoriaId) : torneo.categorias.map((c) => c.id),
            configuracionPuntos: [],
            configuracionesCategoria: configs,
          })
        }
      })
      .catch((e: unknown) => setErrorFormulario(obtenerMensajeErrorApi(e)))
      .finally(() => setCargandoMeta(false))
  }, [estaEditando, idNumerico])

  const temporadasActivas = useMemo(() => temporadas.filter((temporada) => temporada.activa), [temporadas])
  const categoriasPorId = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias])
  const categoriasVisibles = categorias
    .filter((categoria) => categoria.genero === filtroGeneroCategoria)
    .sort((a, b) => a.nivel - b.nivel)
  const configsOrdenadas = useMemo(
    () =>
      [...formulario.configuracionesCategoria].sort((a, b) => {
        const ca = categoriasPorId.get(a.categoriaId)
        const cb = categoriasPorId.get(b.categoriaId)
        if (!ca || !cb) return 0
        return ca.genero.localeCompare(cb.genero) || ca.nivel - cb.nivel
      }),
    [formulario.configuracionesCategoria, categoriasPorId],
  )

  const costoJugador = formulario.costoInscripcionJugador ?? 0
  const totalPareja = costoJugador * 2
  const porcentajeSenia = formulario.seniaPorcentaje && formulario.seniaPorcentaje > 0 ? formulario.seniaPorcentaje : 50
  const seniaInscripcion = Math.round((totalPareja * porcentajeSenia) / 100)

  function alternarCategoria(id: number) {
    setFormulario((f) => {
      const yaEsta = f.configuracionesCategoria.some((c) => c.categoriaId === id)
      const configuracionesCategoria = yaEsta
        ? f.configuracionesCategoria.filter((c) => c.categoriaId !== id)
        : [...f.configuracionesCategoria, configCategoriaPorDefecto(id)]
      return { ...f, configuracionesCategoria, categoriaIds: configuracionesCategoria.map((c) => c.categoriaId) }
    })
  }

  function actualizarConfig(categoriaId: number, cambios: Partial<ConfiguracionCategoriaTorneoRequest>) {
    setFormulario((f) => ({
      ...f,
      configuracionesCategoria: f.configuracionesCategoria.map((c) =>
        c.categoriaId === categoriaId ? { ...c, ...cambios } : c,
      ),
    }))
  }

  function aplicarPlantillaFormato(categoriaId: number, plantillaId: string) {
    const plantilla = plantillasFormato.find((item) => item.id === Number(plantillaId))
    setFormulario((f) => ({
      ...f,
      configuracionesCategoria: f.configuracionesCategoria.map((c) =>
        c.categoriaId === categoriaId ? aplicarFormatoAConfig(c, plantilla) : c,
      ),
    }))
  }

  function cambiarFormatoCategoria(categoriaId: number, formato: FormatoTorneo) {
    setFormulario((f) => ({
      ...f,
      configuracionesCategoria: f.configuracionesCategoria.map((c) =>
        c.categoriaId === categoriaId
          ? {
              ...c,
              formato,
              plantillaFormatoId: null,
              plantillaPuntosId: null,
              cantidadParejasObjetivo: null,
              cantidadGrupos: null,
              parejasPorGrupo: null,
              avanzanPorGrupo: null,
              cupo: null,
              incluyeFaseGrupos: formato !== 'ELIMINACION_DIRECTA',
              incluyeEliminacion: formato !== 'LIGA',
              configuracionPuntos: [],
            }
          : c,
      ),
    }))
  }

  function aplicarPlantillaPuntos(categoriaId: number, plantillaId: string) {
    const plantilla = plantillasPuntos.find((item) => item.id === Number(plantillaId))
    actualizarConfig(categoriaId, { plantillaPuntosId: plantilla?.id ?? null, configuracionPuntos: [] })
  }

  async function manejarEnviar() {
    if (!formulario.nombre.trim()) { setErrorFormulario('El nombre es obligatorio.'); return }
    if (!formulario.fechaInicio) { setErrorFormulario('La fecha de inicio es obligatoria.'); return }
    if (!formulario.lugarId) { setErrorFormulario('Seleccioná el lugar del torneo.'); return }
    if (!formulario.temporadaId) { setErrorFormulario('Seleccioná la temporada del torneo.'); return }
    if (puedeEditarConfig) {
      if (formulario.configuracionesCategoria.length === 0) { setErrorFormulario('Seleccioná al menos una categoría.'); return }
      if (plantillasFormato.length > 0 && formulario.configuracionesCategoria.some((c) => !c.plantillaFormatoId)) {
        setErrorFormulario('Cada categoría necesita una plantilla de formato.'); return
      }
      if (formulario.sumaPuntosRanking && plantillasPuntos.length > 0 && formulario.configuracionesCategoria.some((c) => !c.plantillaPuntosId)) {
        setErrorFormulario('Con suma de puntos, cada categoría necesita una plantilla de puntos.'); return
      }
    }

    setEnviando(true)
    setErrorFormulario(null)
    try {
      const primera = formulario.configuracionesCategoria[0]
      const cupos: Record<number, number> = {}
      formulario.configuracionesCategoria.forEach((c) => { if (c.cupo && c.cupo > 0) cupos[c.categoriaId] = c.cupo })
      const datos: TorneoRequest = {
        ...formulario,
        formato: primera?.formato ?? formulario.formato,
        tipoSorteo: primera?.tipoSorteo ?? formulario.tipoSorteo,
        incluyeFaseGrupos: primera?.incluyeFaseGrupos ?? formulario.incluyeFaseGrupos,
        incluyeEliminacion: primera?.incluyeEliminacion ?? formulario.incluyeEliminacion,
        mejorDeSets: primera?.mejorDeSets ?? formulario.mejorDeSets,
        plantillaFormatoId: primera?.plantillaFormatoId ?? null,
        plantillaPuntosId: primera?.plantillaPuntosId ?? null,
        categoriaIds: formulario.configuracionesCategoria.map((c) => c.categoriaId),
        cuposPorCategoria: cupos,
        configuracionPuntos: [],
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

  async function manejarReaplicarPuntos() {
    if (!idNumerico) return
    setReaplicando(true)
    setMensajeReaplicar(null)
    setErrorFormulario(null)
    try {
      await tournamentsApi.reapplyPointTemplate(idNumerico)
      setMensajeReaplicar('Plantillas reaplicadas por categoría y ranking recalculado.')
    } catch (e: unknown) {
      setErrorFormulario(obtenerMensajeErrorApi(e))
    } finally {
      setReaplicando(false)
    }
  }

  if (cargandoMeta) return <section className="py-8"><StatusMessage type="loading" title="Cargando formulario..." /></section>

  const hayPlantillaPuntosEnAlguna = formulario.configuracionesCategoria.some((c) => c.plantillaPuntosId)

  return (
    <section>
      <Button variant="ghost" size="sm" asChild>
        <NavLink to={volverDestino}><ArrowLeft size={16} />{estaEditando ? 'Volver al torneo' : 'Volver a torneos'}</NavLink>
      </Button>

      <div className="mt-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-rp-accent">Admin</p>
        <h1 className="mt-2 text-2xl font-black text-rp-text sm:text-3xl">{estaEditando ? 'Configuración del torneo' : 'Nuevo torneo'}</h1>
        {estaEditando && !puedeEditarConfig && (
          <p className="mt-3 rounded-md border border-rp-accent/40 bg-rp-accent/10 px-3 py-2 text-sm font-bold text-rp-muted">
            El torneo ya fue sorteado: solo podés editar datos básicos, lugar y temporada. El formato y las categorías quedan fijos.
          </p>
        )}
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
                  <input type="file" accept="image/jpeg,image/png" onChange={(e) => setArchivoImagen(e.target.files?.[0] ?? null)} className="w-full min-w-0 max-w-full rounded-md border border-rp-border bg-rp-surface px-3 py-2 text-sm text-rp-muted" />
                </label>
              </div>
              <p className="text-xs leading-5 text-rp-muted">El cupo máximo de parejas se define por categoría más abajo. JPG o PNG, ideal cuadrada y menor a 2 MB.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Fecha de inicio" type="date" value={formulario.fechaInicio} onChange={(e) => setFormulario((f) => ({ ...f, fechaInicio: e.target.value }))} />
                <Input label="Fecha de fin (opcional)" type="date" value={formulario.fechaFin ?? ''} onChange={(e) => setFormulario((f) => ({ ...f, fechaFin: e.target.value || null }))} />
              </div>
            </div>
          </fieldset>

          <fieldset disabled={!puedeEditarConfig} className={`rounded-lg border border-rp-border bg-rp-surface/82 p-5 ${puedeEditarConfig ? '' : 'opacity-60'}`}>
            <legend className="px-1 text-xs font-black uppercase tracking-[0.14em] text-rp-accent">Configuración por categoría</legend>
            <p className="mt-2 text-xs text-rp-muted">Cada categoría define su propio formato, cupo y puntos.</p>
            {configsOrdenadas.length === 0 ? (
              <p className="mt-4 text-sm text-rp-muted">Seleccioná categorías en el panel de la derecha para configurarlas.</p>
            ) : (
              <div className="mt-4 flex flex-col gap-4">
                {configsOrdenadas.map((config) => (
                  <PanelCategoria
                    key={config.categoriaId}
                    config={config}
                    categoria={categoriasPorId.get(config.categoriaId)}
                    plantillasFormato={plantillasFormato}
                    plantillasPuntos={plantillasPuntos}
                    sumaPuntos={formulario.sumaPuntosRanking}
                    onCambio={(cambios) => actualizarConfig(config.categoriaId, cambios)}
                    onFormato={(formato) => cambiarFormatoCategoria(config.categoriaId, formato)}
                    onPlantillaFormato={(valor) => aplicarPlantillaFormato(config.categoriaId, valor)}
                    onPlantillaPuntos={(valor) => aplicarPlantillaPuntos(config.categoriaId, valor)}
                  />
                ))}
              </div>
            )}
          </fieldset>

          {estaEditando && idNumerico && formulario.sumaPuntosRanking && hayPlantillaPuntosEnAlguna ? (
            <div className="rounded-lg border border-rp-border bg-rp-surface/82 p-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-rp-accent">Reaplicar plantillas de puntos</p>
              <p className="mt-2 text-sm text-rp-muted">Vuelve a copiar las rondas de la plantilla de puntos de cada categoría sobre este torneo y recalcula el ranking. Útil si editaste alguna plantilla en un torneo ya sorteado.</p>
              {mensajeReaplicar && <p className="mt-3 rounded-md border border-rp-accent/40 bg-rp-accent/10 px-3 py-2 text-sm font-bold text-rp-muted">{mensajeReaplicar}</p>}
              <div className="mt-3">
                <Button type="button" variant="subtle" size="sm" onClick={manejarReaplicarPuntos} disabled={reaplicando}>
                  {reaplicando ? 'Reaplicando...' : 'Reaplicar a todas las categorías'}
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-5">
          <fieldset disabled={!puedeEditarConfig} className={`rounded-lg border border-rp-border bg-rp-surface/82 p-5 ${puedeEditarConfig ? '' : 'opacity-60'}`}>
            <legend className="px-1 text-xs font-black uppercase tracking-[0.14em] text-rp-accent">Categorías</legend>
            <p className="mt-2 text-xs text-rp-muted">{puedeEditarConfig ? 'Seleccioná las categorías que participarán.' : 'Categorías del torneo.'}</p>
            {puedeEditarConfig && (
              <SegmentedToggle
                className="mt-4"
                valor={filtroGeneroCategoria}
                onChange={(valor) => setFiltroGeneroCategoria(valor as Genero)}
                opciones={[{ valor: 'MASCULINO', label: 'Masculino' }, { valor: 'FEMENINO', label: 'Femenino' }]}
              />
            )}
            <div className="mt-4 grid gap-2">
              {categorias.length === 0 ? (
                <p className="text-sm text-rp-muted">No hay categorías. Creá alguna primero.</p>
              ) : categoriasVisibles.length === 0 ? (
                <p className="text-sm text-rp-muted">No hay categorías para este género.</p>
              ) : categoriasVisibles.map((categoria) => {
                const seleccionada = formulario.configuracionesCategoria.some((c) => c.categoriaId === categoria.id)
                return (
                  <label key={categoria.id} className="flex cursor-pointer items-center gap-3 rounded-md border border-rp-border p-4 transition hover:border-rp-accent/50">
                    <input type="checkbox" checked={seleccionada} onChange={() => alternarCategoria(categoria.id)} className="size-4 shrink-0 accent-rp-accent" />
                    <span className="text-sm font-bold text-rp-text">{categoria.nombre}</span>
                    <span className="ml-auto whitespace-nowrap text-xs text-rp-muted">Nivel {categoria.nivel} · {categoria.genero === 'MASCULINO' ? 'Masc.' : 'Fem.'}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="rounded-lg border border-rp-border bg-rp-surface/82 p-5">
            <legend className="px-1 text-xs font-black uppercase tracking-[0.14em] text-rp-accent">Lugar y temporada</legend>
            <p className="mt-2 text-xs text-rp-muted">Ambos son obligatorios: el lugar ordena el panel de la sede y la temporada define en qué ranking suma.</p>
            <div className="mt-4 grid gap-4">
              <Select label="Lugar (obligatorio)" value={formulario.lugarId?.toString() ?? ''} onChange={(e) => setFormulario((f) => ({ ...f, lugarId: e.target.value ? Number(e.target.value) : null }))} placeholder="Seleccionar lugar">
                {lugares.map((lugar) => <option key={lugar.id} value={lugar.id}>{lugar.nombre}</option>)}
              </Select>
              <Select label="Temporada (obligatoria)" value={formulario.temporadaId?.toString() ?? ''} onChange={(e) => setFormulario((f) => ({ ...f, temporadaId: e.target.value ? Number(e.target.value) : null }))} placeholder="Seleccionar temporada">
                {temporadasActivas.map((temporada) => <option key={temporada.id} value={temporada.id}>{temporada.nombre}</option>)}
              </Select>
            </div>
          </fieldset>

          <fieldset className="rounded-lg border border-rp-border bg-rp-surface/82 p-5">
            <legend className="px-1 text-xs font-black uppercase tracking-[0.14em] text-rp-accent">Inscripción y premios</legend>
            <div className="mt-4 grid gap-4">
              <Input label="Costo de inscripción por jugador" type="number" min={0} value={formulario.costoInscripcionJugador?.toString() ?? ''} onChange={(e) => setFormulario((f) => ({ ...f, costoInscripcionJugador: e.target.value ? Number(e.target.value) : null }))} placeholder="20000" />
              <Input label="Premio acumulado / prize pool (opcional)" type="number" min={0} value={formulario.premioAcumulado?.toString() ?? ''} onChange={(e) => setFormulario((f) => ({ ...f, premioAcumulado: e.target.value ? Number(e.target.value) : null }))} placeholder="0" />
              <Input label="Seña (% del total, por defecto 50)" type="number" min={1} max={100} value={formulario.seniaPorcentaje?.toString() ?? ''} onChange={(e) => setFormulario((f) => ({ ...f, seniaPorcentaje: e.target.value ? Number(e.target.value) : null }))} placeholder="50" />
            </div>
            {formulario.costoInscripcionJugador ? (
              <p className="mt-3 rounded-md border border-rp-border bg-rp-bg/55 px-3 py-2 text-xs text-rp-muted">
                {formatearMoneda(costoJugador)} por jugador · {formatearMoneda(totalPareja)} la pareja · seña {formatearMoneda(seniaInscripcion)} ({porcentajeSenia}%)
              </p>
            ) : (
              <p className="mt-3 rounded-md border border-rp-accent/40 bg-rp-accent/10 px-3 py-2 text-xs font-bold text-rp-muted">⚠ Sin costo de inscripción, el público NO puede inscribirse online: solo el admin puede cargar parejas a mano.</p>
            )}
            <div className="mt-4">
              <label className="flex cursor-pointer items-center gap-3 text-sm font-bold text-rp-muted">
                <input type="checkbox" checked={formulario.sumaPuntosRanking} onChange={(e) => setFormulario((f) => ({ ...f, sumaPuntosRanking: e.target.checked }))} className="size-4 accent-rp-accent" />
                Suma puntos al ranking
              </label>
            </div>
          </fieldset>

          <div className="flex flex-col gap-3">
            {errorFormulario && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorFormulario}</p>}
            <Button onClick={manejarEnviar} disabled={enviando} className="w-full">
              {enviando ? 'Guardando...' : estaEditando ? 'Guardar cambios' : 'Crear torneo'}
            </Button>
            <Button variant="ghost" asChild className="w-full">
              <NavLink to={volverDestino}>Cancelar</NavLink>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

type PanelCategoriaProps = {
  config: ConfiguracionCategoriaTorneoRequest
  categoria: CategoriaResponse | undefined
  plantillasFormato: PlantillaFormatoResponse[]
  plantillasPuntos: PlantillaPuntosResponse[]
  sumaPuntos: boolean
  onCambio: (cambios: Partial<ConfiguracionCategoriaTorneoRequest>) => void
  onFormato: (formato: FormatoTorneo) => void
  onPlantillaFormato: (valor: string) => void
  onPlantillaPuntos: (valor: string) => void
}

const FORMATOS_TORNEO: FormatoTorneo[] = ['LIGA', 'MINITORNEO', 'TORNEO_LARGO', 'ELIMINACION_DIRECTA']

function PanelCategoria({ config, categoria, plantillasFormato, plantillasPuntos, sumaPuntos, onCambio, onFormato, onPlantillaFormato, onPlantillaPuntos }: PanelCategoriaProps) {
  const plantillaFormatoSeleccionada = plantillasFormato.find((p) => p.id === config.plantillaFormatoId)
  const plantillaPuntosSeleccionada = plantillasPuntos.find((p) => p.id === config.plantillaPuntosId)
  const plantillasFormatoFiltradas = plantillasFormato.filter((p) => p.formatoTorneo === config.formato)
  const plantillasPuntosFiltradas = plantillasPuntos.filter((p) => !p.formatoTorneo || p.formatoTorneo === config.formato)

  const advertenciaPuntos = (() => {
    if (!sumaPuntos || !plantillaPuntosSeleccionada) return null
    const esLiga = config.formato === 'LIGA'
    const rondas = plantillaPuntosSeleccionada.rondas.map((r) => normalizarRondaSimple(r.nombreRonda))
    const faltan: string[] = []
    if ((esLiga || config.incluyeFaseGrupos) && !rondas.includes('GRUPOS')) {
      faltan.push(esLiga ? 'una ronda de liga ("Fecha")' : 'una ronda "Grupos"')
    }
    if (!esLiga && config.incluyeEliminacion && !rondas.some((r) => ['TREINTAIDOSAVOS', 'DIECISEISAVOS', 'OCTAVOS', 'CUARTOS', 'SEMIFINAL', 'FINAL'].includes(r))) {
      faltan.push('rondas de eliminación (al menos "Final")')
    }
    if (faltan.length === 0) return null
    return `La plantilla de puntos no incluye ${faltan.join(' ni ')}. Esos partidos sumarían 0 al ranking.`
  })()

  return (
    <div className="rounded-lg border border-rp-border bg-rp-bg/45 p-4">
      <p className="text-sm font-black text-rp-text">{categoria?.nombre ?? `Categoría ${config.categoriaId}`}</p>
      <SegmentedToggle
        className="mt-3"
        valor={config.formato}
        onChange={onFormato}
        opciones={FORMATOS_TORNEO.map((formato) => ({ valor: formato, label: formatearEnum(formato) }))}
      />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Select label="Plantilla de formato" value={config.plantillaFormatoId?.toString() ?? ''} onChange={(e) => onPlantillaFormato(e.target.value)} placeholder={plantillasFormatoFiltradas.length === 0 ? 'Sin plantillas de este formato' : 'Seleccionar...'}>
          {config.plantillaFormatoId && !plantillasFormatoFiltradas.some((p) => p.id === config.plantillaFormatoId) && (
            <option value={config.plantillaFormatoId}>Plantilla actual</option>
          )}
          {plantillasFormatoFiltradas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </Select>
        <Select label="Plantilla de puntos" value={config.plantillaPuntosId?.toString() ?? ''} onChange={(e) => onPlantillaPuntos(e.target.value)} placeholder={sumaPuntos ? 'Seleccionar...' : 'No suma ranking'}>
          {config.plantillaPuntosId && !plantillasPuntosFiltradas.some((p) => p.id === config.plantillaPuntosId) && (
            <option value={config.plantillaPuntosId}>Plantilla actual</option>
          )}
          {plantillasPuntosFiltradas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </Select>
        <Select label="Formato de sets" value={String(config.mejorDeSets ?? 3)} onChange={(e) => onCambio({ mejorDeSets: Number(e.target.value) })}>
          <option value="3">Mejor de 3 sets</option>
          <option value="1">A 1 set</option>
        </Select>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-rp-muted sm:grid-cols-2">
        <ResumenPlantilla title="Formato" lineas={plantillaFormatoSeleccionada ? [
          formatearEnum(plantillaFormatoSeleccionada.formatoTorneo),
          formatearEnum(config.tipoSorteo),
          config.cantidadParejasObjetivo ? `Cupo ${config.cantidadParejasObjetivo} parejas` : 'Cupo según parejas',
          config.incluyeFaseGrupos ? 'Con fase de grupos' : 'Sin fase de grupos',
          config.incluyeEliminacion ? 'Con eliminación' : 'Sin eliminación',
        ] : ['Sin plantilla seleccionada']} />
        <ResumenPlantilla title="Puntos" lineas={plantillaPuntosSeleccionada ? plantillaPuntosSeleccionada.rondas.map((r) => `${r.nombreRonda}: ${r.puntosGanador}/${r.puntosPerdedor}`) : ['Sin plantilla seleccionada']} />
      </div>
      {advertenciaPuntos && (
        <p className="mt-3 rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-xs font-bold text-rp-danger">⚠ {advertenciaPuntos}</p>
      )}
    </div>
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
