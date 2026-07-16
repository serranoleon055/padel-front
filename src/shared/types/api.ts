export type Genero = 'MASCULINO' | 'FEMENINO'

export type PosicionJuego = 'DRIVE' | 'REVES'

export type EstadoTorneo = 'BORRADOR' | 'INSCRIPCION' | 'SORTEADO' | 'EN_CURSO' | 'FINALIZADO' | 'CANCELADO'

export type FormatoTorneo = 'MINITORNEO' | 'TORNEO_LARGO' | 'LIGA' | 'ELIMINACION_DIRECTA'

export type TipoSorteo = 'ALEATORIO' | 'CABEZAS_SERIE'

export type EstadoPartido = 'PENDIENTE' | 'EN_CURSO' | 'FINALIZADO' | 'BYE' | 'WALKOVER' | 'RETIRO'

export type CanchaResponse = {
  id: number
  nombre: string
  descripcion: string | null
  activo: boolean
  lugarId: number | null
  lugarNombre: string | null
  precioPorHora?: number | null
  seniaPorcentaje?: number | null
  seniaObligatoria: boolean
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
  agenda: JugadorHistorialTorneoItem[]
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

export type ConfiguracionCategoriaTorneoRequest = {
  categoriaId: number
  formato: FormatoTorneo
  plantillaFormatoId?: number | null
  plantillaPuntosId?: number | null
  cantidadParejasObjetivo?: number | null
  cantidadGrupos?: number | null
  parejasPorGrupo?: number | null
  avanzanPorGrupo?: number | null
  incluyeFaseGrupos: boolean
  incluyeEliminacion: boolean
  tipoSorteo: TipoSorteo
  mejorDeSets?: number | null
  cupo?: number | null
  configuracionPuntos: ConfiguracionPuntosRequest[]
}

export type ConfiguracionCategoriaTorneoResponse = {
  categoriaId: number
  categoriaNombre: string | null
  formato: FormatoTorneo
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
  tipoSorteo: TipoSorteo
  mejorDeSets: number | null
  cupo: number | null
  configuracionPuntos: ConfiguracionPuntosResponse[]
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
  formatoTorneo?: FormatoTorneo | null
  activo: boolean
  rondas: PlantillaPuntosRondaRequest[]
}

export type PlantillaPuntosResponse = {
  id: number
  nombre: string
  descripcion: string | null
  formatoTorneo: FormatoTorneo | null
  activo: boolean
  rondas: PlantillaPuntosRondaResponse[]
}

export type TorneoRequest = {
  nombre: string
  descripcion?: string | null
  imagenUrl?: string | null
  cupoMaximoParejas?: number | null
  costoInscripcionJugador?: number | null
  premioAcumulado?: number | null
  seniaPorcentaje?: number | null
  cuposPorCategoria?: Record<number, number>
  formato: FormatoTorneo
  fechaInicio: string
  fechaFin?: string | null
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
  configuracionesCategoria: ConfiguracionCategoriaTorneoRequest[]
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
  costoInscripcionJugador?: number | null
  premioAcumulado?: number | null
  seniaPorcentaje?: number | null
  cuposPorCategoria?: Record<number, number>
  parejasPorCategoria?: Record<number, number>
  formato: FormatoTorneo
  estado: EstadoTorneo
  fechaInicio: string | null
  fechaFin: string | null
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
  configuracionesCategoria?: ConfiguracionCategoriaTorneoResponse[]
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
  jugador1Id: number | null
  jugador2Id: number | null
  jugador1Nombre: string
  jugador2Nombre: string
  categoriaId: number | null
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
  jornada: number | null
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
  campeones: CampeonResponse[]
}

export type CrucePreviewResponse = {
  ronda: string
  local: string
  visitante: string
}

export type CampeonResponse = {
  torneoId: number | null
  torneoNombre: string | null
  categoriaId: number | null
  categoriaNombre: string | null
  genero: Genero | null
  campeonaId: number | null
  campeonaNombre: string | null
  subcampeonaNombre: string | null
  campeonaJugador1Id: number | null
  campeonaJugador1Nombre: string | null
  campeonaJugador2Id: number | null
  campeonaJugador2Nombre: string | null
  subcampeonaJugador1Id: number | null
  subcampeonaJugador1Nombre: string | null
  subcampeonaJugador2Id: number | null
  subcampeonaJugador2Nombre: string | null
  marcadorFinal: string | null
  fecha: string | null
  lugarNombre: string | null
}

export type HomeSummaryResponse = {
  torneosActivos: number
  jugadoresRegistrados: number
  partidosFinalizados: number
  partidosEnVivo: number
  categoriasActivas: number
}

export type TurnoResumenResponse = {
  canchaId: number | null
  canchaNombre: string
  horaInicio: string
  horaFin: string
  clienteNombre: string
}

export type ReservaPendienteResumen = {
  id: number
  canchaId: number | null
  canchaNombre: string | null
  fecha: string | null
  horaInicio: string | null
  horaFin: string | null
  estado: string | null
  clienteNombre: string | null
  clienteTelefono: string | null
  codigo: string | null
}

export type SolicitudPendienteResumen = {
  id: number
  torneoId: number | null
  torneoNombre: string | null
  categoriaId: number | null
  categoriaNombre: string | null
  estado: string | null
  jugador1: string | null
  jugador2: string | null
  telefonoContacto: string | null
}

export type HorarioSede = { dias: string; horas: string }
export type FotoSede = { url: string; alt: string }

export type ConfiguracionSede = {
  email: string | null
  telefono: string | null
  whatsapp: string | null
  instagram: string | null
  facebook: string | null
  direccion: string | null
  mapsEmbedUrl: string | null
  horarios: HorarioSede[]
  galeria: FotoSede[]
  formasPago: string[]
  mercadoPagoAccessToken?: string | null
  mercadoPagoConfigurado?: boolean
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

export type CanchaEstadoDashboard = {
  id: number
  nombre: string
  ocupadaAhora: boolean
}

export type AdminDashboardResponse = {
  summary: HomeSummaryResponse
  temporadaActiva: TemporadaResponse | null
  ultimosTorneos: TorneoResponse[]
  torneosEnVivo: TorneoResponse[]
  canchasTotales: number
  canchasOcupadasAhora: number
  canchasLibresAhora: number
  turnosDisponiblesHoy: number
  canchas: CanchaEstadoDashboard[]
  reservasHoy: number
  reservasPendientes: number
  solicitudesPendientes: number
  torneosFinalizados: number
  torneosEnInscripcion: number
  ingresoEstimadoHoy: number | null
  turnosPorDiaSemana: number[]
  proximosTurnosHoy: TurnoResumenResponse[]
  reservasPendientesLista: ReservaPendienteResumen[]
  solicitudesPendientesLista: SolicitudPendienteResumen[]
}

export type EstadisticasResponse = {
  heatmap: { diaSemana: number; hora: number; cantidad: number }[]
  canchasMasUsadas: { canchaNombre: string; reservas: number }[]
  ingresosPorMes: { mes: string; turnos: number; inscripciones: number }[]
  reservasTotales: number
  reservasCanceladas: number
  tasaCancelacion: number
  embudoTorneos: { torneoId: number; torneoNombre: string; inscriptos: number; cupo: number | null; ingresos: number }[]
  categoriasDemandadas: { categoriaNombre: string; inscriptos: number }[]
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
  ultimosCampeones: CampeonResponse[]
  rankingDestacado: RankingResponse[]
}
