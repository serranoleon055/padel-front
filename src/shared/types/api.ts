export type Genero = 'MASCULINO' | 'FEMENINO'

export type PosicionJuego = 'DRIVE' | 'REVES'

export type EstadoTorneo = 'BORRADOR' | 'INSCRIPCION' | 'SORTEADO' | 'EN_CURSO' | 'FINALIZADO' | 'CANCELADO'

export type FormatoTorneo = 'MINITORNEO' | 'TORNEO_LARGO' | 'LIGA' | 'ELIMINACION_DIRECTA'

export type TipoSorteo = 'ALEATORIO' | 'CABEZAS_SERIE' | 'COMBINADO'

export type EstadoPartido = 'PENDIENTE' | 'EN_CURSO' | 'FINALIZADO' | 'BYE' | 'WALKOVER' | 'RETIRO'

export type CanchaResponse = {
  id: number
  nombre: string
  descripcion: string | null
  activo: boolean
  lugarId: number | null
  lugarNombre: string | null
}

export type FasePartido = 'GRUPOS' | 'ELIMINACION'

export type EstadoPareja = 'ACTIVA' | 'ELIMINADA' | 'CAMPEON'

export type ApiError = {
  status: number
  error: string
  mensaje: string
  timestamp: string
}

export type LoginRequest = {
  username: string
  password: string
}

export type LoginResponse = {
  token: string
}

export type AdminUserResponse = {
  id: number
  username: string
}

export type AdminUserRequest = {
  username: string
  password?: string
}

export type CategoriaResponse = {
  id: number
  nombre: string
  nivel: number
  edadMin?: number | null
  edadMax?: number | null
  genero: Genero
}

export type CategoriaRequest = {
  nombre: string
  nivel: number
  genero: Genero
}

export type JugadorResponse = {
  id: number
  nombre: string
  apellido: string
  genero: Genero
  fotoUrl: string | null
  fechaRegistro: string | null
  categoriaId: number | null
  categoriaNombre: string | null
  posicionJuego: PosicionJuego | null
}

export type JugadorRequest = {
  nombre: string
  apellido: string
  genero: Genero
  fotoUrl?: string | null
  categoriaId?: number | null
  telefono?: string | null
  fechaNacimiento?: string | null
  posicionJuego?: PosicionJuego | null
}

export type JugadorFichaResponse = {
  id: number
  fechaNacimiento: string | null
  telefono: string | null
}

export type JugadorHistorialTorneoItem = {
  torneoId: number
  torneoNombre: string
  categoriaNombre: string | null
  estado: string | null
  fechaInicio: string | null
  fechaFin: string | null
  fueGanador: boolean
  mejorRonda: string
  puntosObtenidos: number
}

export type JugadorHistorialResponse = {
  jugador: JugadorResponse
  ranking: RankingResponse[]
  partidos: PartidoResponse[]
  torneos: JugadorHistorialTorneoItem[]
}

export type LugarResponse = {
  id: number
  nombre: string
  direccion: string
  cantidadCanchas?: number | null
}

export type LugarRequest = {
  nombre: string
  direccion: string
}

export type TemporadaResponse = {
  id: number
  nombre: string
  fechaInicio: string
  fechaFin: string | null
  activa: boolean
}

export type TemporadaRequest = {
  nombre: string
  fechaInicio: string
  fechaFin?: string | null
  activa?: boolean
}

export type ConfiguracionPuntosRequest = {
  nombreRonda: string
  puntosGanador: number
  puntosPerdedor: number
  orden: number
}

export type PlantillaFormatoRequest = {
  nombre: string
  descripcion?: string | null
  formatoTorneo: FormatoTorneo
  tipoSorteo: TipoSorteo
  cantidadParejasObjetivo?: number | null
  cantidadGrupos?: number | null
  parejasPorGrupo?: number | null
  avanzanPorGrupo?: number | null
  incluyeFaseGrupos: boolean
  incluyeEliminacion: boolean
  activo: boolean
}

export type PlantillaFormatoResponse = PlantillaFormatoRequest & {
  id: number
}

export type PlantillaPuntosRondaRequest = ConfiguracionPuntosRequest

export type PlantillaPuntosRondaResponse = PlantillaPuntosRondaRequest & {
  id: number
}

export type PlantillaPuntosRequest = {
  nombre: string
  descripcion?: string | null
  activo: boolean
  rondas: PlantillaPuntosRondaRequest[]
}

export type PlantillaPuntosResponse = {
  id: number
  nombre: string
  descripcion: string | null
  activo: boolean
  rondas: PlantillaPuntosRondaResponse[]
}

export type TorneoRequest = {
  nombre: string
  descripcion?: string | null
  imagenUrl?: string | null
  cupoMaximoParejas?: number | null
  cuposPorCategoria?: Record<number, number>
  formato: FormatoTorneo
  fechaInicio: string
  fechaFin?: string | null
  esMixto: boolean
  sumaPuntosRanking: boolean
  plantillaFormatoId?: number | null
  plantillaPuntosId?: number | null
  cantidadParejasObjetivo?: number | null
  cantidadGrupos?: number | null
  parejasPorGrupo?: number | null
  avanzanPorGrupo?: number | null
  incluyeFaseGrupos: boolean
  incluyeEliminacion: boolean
  mejorDeSets?: number
  tipoSorteo: TipoSorteo
  temporadaId?: number | null
  lugarId?: number | null
  categoriaIds: number[]
  configuracionPuntos: ConfiguracionPuntosRequest[]
}

export type CambioEstadoRequest = {
  estado: EstadoTorneo
}

export type ParejaRequest = {
  jugador1Id: number
  jugador2Id: number
  categoriaId: number
  esCabezaDeSerie: boolean
}

export type ResultadoRequest = {
  marcador: string
}

export type TorneoResponse = {
  id: number
  nombre: string
  descripcion?: string | null
  imagenUrl?: string | null
  cupoMaximoParejas?: number | null
  cuposPorCategoria?: Record<number, number>
  parejasPorCategoria?: Record<number, number>
  formato: FormatoTorneo
  estado: EstadoTorneo
  fechaInicio: string | null
  fechaFin: string | null
  esMixto: boolean
  sumaPuntosRanking: boolean
  plantillaFormatoId: number | null
  plantillaFormatoNombre: string | null
  plantillaPuntosId: number | null
  plantillaPuntosNombre: string | null
  cantidadParejasObjetivo: number | null
  cantidadGrupos: number | null
  parejasPorGrupo: number | null
  avanzanPorGrupo: number | null
  incluyeFaseGrupos: boolean
  incluyeEliminacion: boolean
  mejorDeSets?: number | null
  tipoSorteo: TipoSorteo
  temporadaId: number | null
  temporadaNombre: string | null
  lugarId: number | null
  lugarNombre: string | null
  categorias: CategoriaResponse[]
  cantidadCategorias: number
  cantidadParejas: number
  cantidadPartidos: number
  partidosFinalizados: number
  configuracionPuntos?: ConfiguracionPuntosResponse[]
}

export type ConfiguracionPuntosResponse = {
  nombreRonda: string
  puntosGanador: number
  puntosPerdedor: number
  orden: number
}

export type RankingResponse = {
  posicion: number
  jugadorId: number
  jugadorNombre: string
  jugadorFotoUrl: string | null
  categoriaId: number
  categoriaNombre: string
  puntosTotales: number
  torneosJugados: number
  victorias: number
  derrotas: number
  tendencia: string
}

export type ParejaResponse = {
  id: number
  jugador1Nombre: string
  jugador2Nombre: string
  categoriaNombre: string
  esCabezaDeSerie: boolean
  estado: EstadoPareja
}

export type PartidoResponse = {
  id: number
  estado: EstadoPartido
  fase: FasePartido
  fechaHora: string | null
  fechaHoraProgramada: string | null
  canchaId: number | null
  canchaNombre: string | null
  torneoId: number | null
  torneoNombre: string | null
  categoriaId: number | null
  categoriaNombre: string | null
  lugarId: number | null
  lugarNombre: string | null
  grupoId: number | null
  grupoNombre: string | null
  rondaId: number | null
  ronda: string | null
  rondaOrden: number | null
  parejaLocalId: number | null
  parejaVisitanteId: number | null
  marcador: string | null
  jugadorLocal1Id: number | null
  jugadorLocal1Nombre: string | null
  jugadorLocal2Id: number | null
  jugadorLocal2Nombre: string | null
  jugadorVisitante1Id: number | null
  jugadorVisitante1Nombre: string | null
  jugadorVisitante2Id: number | null
  jugadorVisitante2Nombre: string | null
  ganadorId: number | null
  ganadorNombre: string | null
}

export type TorneoDetalleResponse = {
  torneo: TorneoResponse
  parejas: ParejaResponse[]
  partidos: PartidoResponse[]
}

export type HomeSummaryResponse = {
  torneosActivos: number
  jugadoresRegistrados: number
  partidosFinalizados: number
  partidosEnVivo: number
  torneosTotales: number
  categoriasActivas: number
}

export type PosicionGrupoResponse = {
  id: number
  posicion: number
  pj: number
  pg: number
  pp: number
  puntos: number
  setsGanados: number
  setsPerdidos: number
  juegosGanados: number
  juegosPerdidos: number
  parejaId: number
  parejaNombre: string
}

export type GrupoResponse = {
  id: number
  nombre: string
  categoriaId: number
  categoriaNombre: string
  posiciones: PosicionGrupoResponse[]
}

export type AdminDashboardResponse = {
  summary: HomeSummaryResponse
  temporadaActiva: TemporadaResponse | null
  ultimosTorneos: TorneoResponse[]
  torneosEnVivo: TorneoResponse[]
  evolucionMeses: number[]
}

export type PagedResponse<T> = {
  contenido: T[]
  pagina: number
  tamanio: number
  totalElementos: number
  totalPaginas: number
  esPrimera: boolean
  esUltima: boolean
}

export type HomeResponse = {
  summary: HomeSummaryResponse
  torneoDestacado: TorneoResponse | null
  proximosTorneos: TorneoResponse[]
  torneosEnVivo: TorneoResponse[]
  partidosEnVivo: PartidoResponse[]
  ultimosResultados: PartidoResponse[]
  ultimosCampeones: PartidoResponse[]
  rankingDestacado: RankingResponse[]
}
