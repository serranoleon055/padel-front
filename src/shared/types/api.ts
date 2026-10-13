export type Genero = 'MASCULINO' | 'FEMENINO'

export type PosicionJuego = 'DRIVE' | 'REVES'

export type EstadoTorneo = 'BORRADOR' | 'INSCRIPCION' | 'SORTEADO' | 'EN_CURSO' | 'FINALIZADO' | 'CANCELADO'

export type FormatoTorneo = 'MINITORNEO' | 'TORNEO_LARGO' | 'LIGA' | 'ELIMINACION_DIRECTA'
export type FormatoPartido = 'TRES_SETS' | 'DOS_SETS_SUPER_TIEBREAK' | 'UN_SET' | 'PRO_SET_9'

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
  /** DUENIO o MOSTRADOR. Solo para saber qué mostrar; los permisos los aplica el backend. */
  rol: 'DUENIO' | 'MOSTRADOR' | null
  usuario: string | null
}

export type RolUsuario = 'DUENIO' | 'MOSTRADOR'

export type AdminUserResponse = {
  id: number
  username: string
  rol: RolUsuario
}

export type AdminUserRequest = {
  username: string
  password?: string
  rol?: RolUsuario
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
  /** Falso solo si el panel pidió ver los dados de baja. */
  activo?: boolean
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
  /** Solo viene en true si el panel pidió ver las archivadas. */
  archivado?: boolean
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
  formatoPartidoGrupos?: FormatoPartido | null
  formatoPartidoEliminacion?: FormatoPartido | null
  formatoPartidoFinales?: FormatoPartido | null
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
  formatoPartidoGrupos?: FormatoPartido | null
  formatoPartidoEliminacion?: FormatoPartido | null
  formatoPartidoFinales?: FormatoPartido | null
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

export type SedePublica = {
  lugarId: number
  nombre: string
  direccion: string | null
}

export type FranjaSede = {
  fecha: string
  horaDesde: string
  horaHasta: string
}

export type PagoSedeResponse = {
  id: number
  fecha: string
  monto: number
  medio: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'MERCADO_PAGO' | 'OTRO'
  notas: string | null
  registradoPor: string | null
  creadoEn: string
  anulado: boolean
  anuladoPor: string | null
  motivoAnulacion: string | null
}

/** Un club del torneo. Montos y pagos llegan en null si quien mira no es el dueño. */
export type TorneoSedeResponse = {
  id: number
  lugarId: number
  lugarNombre: string
  lugarDireccion: string | null
  principal: boolean
  canchas: { id: number; nombre: string }[]
  franjas: FranjaSede[]
  notas: string | null
  montoAcordado: number | null
  totalPagado: number | null
  saldo: number | null
  pagos: PagoSedeResponse[] | null
}

export type TorneoSedeRequest = {
  lugarId: number
  canchaIds: number[]
  franjas: FranjaSede[]
  montoAcordado: number | null
  notas: string | null
}

export type PagoSedeRequest = {
  fecha: string
  monto: number
  medio: PagoSedeResponse['medio']
  notas: string | null
}

export type PagoJugadorResponse = {
  id: number
  fecha: string
  monto: number
  medio: PagoSedeResponse['medio']
  notas: string | null
  online: boolean
  registradoPor: string | null
  creadoEn: string
  anulado: boolean
  anuladoPor: string | null
  motivoAnulacion: string | null
}

export type CuentaJugador = {
  jugadorId: number
  nombre: string
  telefono: string | null
  costo: number
  pagado: number
  saldo: number
  pagos: PagoJugadorResponse[]
}

export type CuentaPareja = {
  parejaId: number
  categoriaId: number | null
  categoriaNombre: string | null
  estado: string
  saldo: number
  jugadores: CuentaJugador[]
}

export type CuentaInscripcionesResponse = {
  torneoId: number
  totalEsperado: number
  totalCobrado: number
  totalPendiente: number
  jugadoresConDeuda: number
  jugadoresAlDia: number
  parejas: CuentaPareja[]
}

export type PagoJugadorRequest = {
  jugadorId: number
  fecha: string
  monto: number
  medio: PagoSedeResponse['medio']
  notas: string | null
}

/** Un horario en que la pareja NO puede jugar: un día del torneo o un día de la semana (1 = lunes). */
export type RestriccionHoraria = {
  fecha?: string | null
  diaSemana?: number | null
  horaDesde: string
  horaHasta: string
}

export type DisponibilidadPareja = {
  parejaId: number
  categoriaNombre: string | null
  jugador1Nombre: string | null
  jugador2Nombre: string | null
  restricciones: RestriccionHoraria[]
  notas: string | null
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
  sedes?: SedePublica[]
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
  /** Cómo se juega este partido según su categoría y fase. Null en un backend viejo. */
  formatoPartido?: FormatoPartido | null
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
  /**
   * Datos para resolver duplicados. Si alguien se cargó como nuevo pero ya existe un
   * jugador con ese nombre, hay que elegir cuál es antes de aprobar, o se crea un
   * jugador repetido. El panel no resuelve el duplicado: manda al torneo, que sí sabe.
   */
  jugador1EsNuevo?: boolean
  jugador2EsNuevo?: boolean
  jugador1Candidatos?: { id: number; nombre: string; apellido: string }[]
  jugador2Candidatos?: { id: number; nombre: string; apellido: string }[]
  pagada?: boolean
  montoSenia?: number | null
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
  /** Hasta cuántas horas antes puede el jugador cancelar su turno solo. 0 = lo apaga. */
  cancelacionHorasMinimas: number | null
  /** Propuesta de fondo para el formulario de apertura de caja. */
  fondoFijo: number | null
  /** Hasta que porcentaje puede bonificar el empleado sin el dueño. 0 = no puede. */
  descuentoMaximoMostrador: number | null
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

export type DisponibilidadDuracion = {
  minutos: number
  turnos: number
}

export type AdminDashboardResponse = {
  /** Jornada que el club está atendiendo. A la 1 AM no es la fecha de hoy. */
  fechaJornada: string
  summary: HomeSummaryResponse
  temporadaActiva: TemporadaResponse | null
  ultimosTorneos: TorneoResponse[]
  torneosEnVivo: TorneoResponse[]
  canchasTotales: number
  canchasOcupadasAhora: number
  canchasLibresAhora: number
  turnosDisponiblesHoy: number
  /** El mismo hueco contado con cada duración que vende el club: no se suman entre sí. */
  disponiblesPorDuracion: DisponibilidadDuracion[]
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
  /** Hora en que arranca la jornada: el gráfico de horas se dibuja desde acá. */
  horaApertura: number
  /** Cuántos meses mira el informe, contando el actual. Para rotular el período. */
  mesesDelPanel: number
  canchasMasUsadas: { canchaNombre: string; reservas: number }[]
  /**
   * Estado de resultados del mes, con criterio devengado:
   * `ingresos − costoMercaderia = gananciaBruta`, y `gananciaBruta − gastosOperativos = resultado`.
   * Las compras de mercadería NO son gasto (son inventario): viajan aparte en
   * `comprasMercaderia` solo para informar.
   */
  ingresosPorMes: {
    mes: string
    turnos: number
    inscripciones: number
    ventas: number
    ingresos: number
    costoMercaderia: number
    gananciaBruta: number
    gastosOperativos: number
    comprasMercaderia: number
    resultado: number
  }[]
  reservasTotales: number
  reservasCanceladas: number
  tasaCancelacion: number
  reservasNoShow: number
  tasaNoShow: number
  mesActual: {
    mes: string
    facturado: number
    facturadoMesAnterior: number
    /** Variación contra el mes anterior. Null si el anterior fue cero. */
    variacion: number | null
    resultado: number
    turnosJugados: number
    ticketPromedioTurno: number
    ocupacion: number
    ingresoPorHoraAbierta: number
    deudaAcumulada: number
  }
  ocupacionPorCancha: {
    canchaNombre: string
    horasVendidas: number
    horasDisponibles: number
    ocupacion: number
    facturado: number
  }[]
  rendimientoProductos: {
    productoId: number
    nombre: string
    unidades: number
    facturado: number
    ganancia: number
    margen: number | null
    /** Unidades vendidas sin costo cargado: con esto el margen esta incompleto. */
    unidadesSinCosto: number
  }[]
  mejoresClientes: { clienteId: number; nombre: string; turnos: number; gastado: number }[]
  kiosco: {
    facturado: number
    ganancia: number
    capitalEnStock: number
    productosBajoMinimo: number
  }
  embudoTorneos: {
    torneoId: number
    torneoNombre: string
    inscriptos: number
    cupo: number | null
    ingresos: number
    categorias: { categoriaId: number; categoriaNombre: string; inscriptos: number; cupo: number | null }[]
  }[]
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
