import { apiClient } from '@/shared/api/apiClient'

export type MedioPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'MERCADO_PAGO' | 'OTRO'

export const MEDIOS: { valor: MedioPago; nombre: string }[] = [
  { valor: 'EFECTIVO', nombre: 'Efectivo' },
  { valor: 'TRANSFERENCIA', nombre: 'Transferencia' },
  { valor: 'TARJETA', nombre: 'Tarjeta' },
  { valor: 'MERCADO_PAGO', nombre: 'Mercado Pago' },
  { valor: 'OTRO', nombre: 'Otro' },
]

export interface CobroRequest {
  monto: number
  medio: MedioPago
  notas: string | null
}

export interface CobroResponse {
  id: number
  reservaId: number
  monto: number
  medio: MedioPago
  cobradoEn: string
  registradoPor: string | null
  notas: string | null
  clienteNombre: string | null
  canchaNombre: string | null
  /** Con fecha, el cobro está anulado y no suma en ningún total. */
  anuladoEn: string | null
  anuladoPor: string | null
  motivoAnulacion: string | null
}

/**
 * Un pago tal como lo hizo el cliente. Un turno de dos horas son dos cobros en la base
 * pero una sola línea acá: el mostrador cobró una vez.
 */
export interface MovimientoCaja {
  cobroIds: number[]
  clienteNombre: string | null
  canchaNombre: string | null
  fechaTurno: string | null
  horaInicio: string | null
  horaFin: string | null
  monto: number
  medio: MedioPago
  cobradoEn: string
  registradoPor: string | null
  notas: string | null
}

export interface TotalMedio {
  medio: MedioPago
  cantidad: number
  total: number
}

export type CategoriaGasto =
  | 'LUZ' | 'AGUA' | 'ALQUILER' | 'MANTENIMIENTO' | 'INSUMOS'
  | 'SUELDOS' | 'IMPUESTOS' | 'MARKETING' | 'OTRO'

export const CATEGORIAS_GASTO: { valor: CategoriaGasto; nombre: string }[] = [
  { valor: 'LUZ', nombre: 'Luz' },
  { valor: 'AGUA', nombre: 'Agua' },
  { valor: 'ALQUILER', nombre: 'Alquiler' },
  { valor: 'MANTENIMIENTO', nombre: 'Mantenimiento' },
  { valor: 'INSUMOS', nombre: 'Insumos' },
  { valor: 'SUELDOS', nombre: 'Sueldos' },
  { valor: 'IMPUESTOS', nombre: 'Impuestos' },
  { valor: 'MARKETING', nombre: 'Marketing' },
  { valor: 'OTRO', nombre: 'Otro' },
]

export interface GastoRequest {
  fecha: string
  categoria: CategoriaGasto
  descripcion: string
  monto: number
  medio: MedioPago
  proveedor: string | null
  notas: string | null
}

export interface GastoResponse {
  id: number
  /** Fecha contable: a qué mes pesa el gasto. La elige la persona. */
  fecha: string
  /** Jornada de caja en la que salió la plata. La estampa el sistema. */
  jornada: string
  categoria: CategoriaGasto
  descripcion: string
  monto: number
  medio: MedioPago
  proveedor: string | null
  registradoPor: string | null
  notas: string | null
  /** Si el egreso fue compra de mercadería y no gasto operativo. */
  esMercaderia: boolean
  /** Anular es baja lógica: la fila queda para poder auditarla. */
  anuladoEn: string | null
  anuladoPor: string | null
  motivoAnulacion: string | null
}

/**
 * Qué fue ese movimiento de plata que no es un turno ni una venta del kiosco.
 *
 * Ninguno es un gasto: un gasto pesa en el estado de resultados y estos no. Todos mueven
 * el efectivo del cajón; solo el cobro vario mueve la facturación del día.
 */
export type ConceptoMovimiento =
  | 'APERTURA' | 'DEPOSITO_BANCO' | 'RETIRO_DUENIO' | 'PRESTAMO' | 'COBRO_VARIO' | 'AJUSTE' | 'OTRO'
  /** Lo genera el cobro de una inscripción en el club; no se carga a mano. */
  | 'INSCRIPCION_TORNEO'

export type TipoMovimiento = 'INGRESO' | 'EGRESO'

/**
 * Los conceptos que el mostrador puede cargar. Los otros sirven para explicar un faltante,
 * así que los reserva el dueño; el backend lo valida igual, esto es solo la pantalla.
 */
export const CONCEPTOS_MOVIMIENTO: {
  valor: ConceptoMovimiento
  nombre: string
  ayuda: string
  tipoFijo: TipoMovimiento | null
  soloDuenio: boolean
}[] = [
  { valor: 'COBRO_VARIO', nombre: 'Cobro que no es un turno', ayuda: 'El alquiler del salón, una clase, un evento. Suma a la facturación del día.', tipoFijo: 'INGRESO', soloDuenio: false },
  { valor: 'DEPOSITO_BANCO', nombre: 'Depósito al banco', ayuda: 'Sale del cajón y no baja la rentabilidad: la plata cambia de lugar.', tipoFijo: 'EGRESO', soloDuenio: true },
  { valor: 'RETIRO_DUENIO', nombre: 'Retiro del dueño', ayuda: 'No es un gasto del club: es plata que ya era suya.', tipoFijo: 'EGRESO', soloDuenio: true },
  { valor: 'PRESTAMO', nombre: 'Préstamo', ayuda: 'Dado o devuelto. Hay que elegir si entra o sale.', tipoFijo: null, soloDuenio: true },
  { valor: 'AJUSTE', nombre: 'Ajuste declarado', ayuda: 'Apareció o faltó plata y queda asentado con su motivo.', tipoFijo: null, soloDuenio: true },
  { valor: 'OTRO', nombre: 'Otro', ayuda: 'No suma a la facturación. Si es un gasto del club, cargalo como gasto.', tipoFijo: null, soloDuenio: false },
]

export interface MovimientoCajaRequest {
  concepto: ConceptoMovimiento
  /** Solo hace falta en los conceptos que van en los dos sentidos. */
  tipo: TipoMovimiento | null
  descripcion: string
  /** Siempre en positivo: el signo lo da el concepto. */
  monto: number
  medio: MedioPago
  clienteId: number | null
  notas: string | null
}

export interface MovimientoSuelto {
  id: number
  jornada: string
  fecha: string
  tipo: TipoMovimiento
  concepto: ConceptoMovimiento
  descripcion: string
  monto: number
  medio: MedioPago
  clienteId: number | null
  clienteNombre: string | null
  registradoPor: string | null
  notas: string | null
  anuladoEn: string | null
  anuladoPor: string | null
  motivoAnulacion: string | null
}

/** Lo que movió cada usuario del panel en la jornada. Solo lo ve el dueño. */
export interface TotalPorUsuario {
  usuario: string
  cobros: number
  ventas: number
  movimientos: number
  total: number
  /** La parte que tiene que estar en el cajón: es lo que se le pide al entregar. */
  efectivo: number
  operaciones: number
}

/** Una fila del historial, con los totales congelados al momento de firmar. */
export interface ArqueoHistorico {
  id: number
  fecha: string
  efectivoEsperado: number
  efectivoContado: number
  diferencia: number
  totalMostrador: number
  seniasOnline: number
  egresos: number
  /** El fondo con el que se abrió el cajón esa noche, congelado al firmar. */
  fondoInicial: number
  cerradoPor: string | null
  cerradoEn: string
  notas: string | null
  /** Null si el arqueo sigue vigente. */
  reabiertoEn: string | null
  reabiertoPor: string | null
  motivoReapertura: string | null
}

export interface PaginaArqueos {
  contenido: ArqueoHistorico[]
  pagina: number
  tamanio: number
  totalElementos: number
  totalPaginas: number
}

/** El arqueo firmado del día: cuánto había de verdad en el cajón y quién lo contó. */
export interface Arqueo {
  efectivoContado: number
  /** Contado menos esperado. Negativo = faltó plata. */
  diferencia: number
  cerradoPor: string | null
  cerradoEn: string
  notas: string | null
}

export interface CierreCaja {
  fecha: string
  porMedio: TotalMedio[]
  efectivoEsperado: number
  /** Mientras sea false, falta declarar el fondo con el que arranca el cajón. */
  cajaAbierta: boolean
  fondoInicial: number
  movimientosIngreso: number
  movimientosEgreso: number
  movimientosSueltos: MovimientoSuelto[]
  movimientosSueltosAnulados: MovimientoSuelto[]
  /** Vacío para el empleado: es la herramienta del dueño para mirar al que cobra. */
  porUsuario: TotalPorUsuario[]
  totalMostrador: number
  /** Señas de TURNO acreditadas en Mercado Pago. */
  seniasOnline: number
  /** Inscripciones a torneos acreditadas en Mercado Pago. Van aparte de las señas. */
  inscripcionesOnline: number
  totalDelDia: number
  turnosConSaldo: number
  saldoPendiente: number
  movimientos: MovimientoCaja[]
  /**
   * Null para el empleado: el detalle de los egresos y la rentabilidad son del dueño, y
   * es lo que `/api/gastos` y `/api/estadisticas` ya le prohíben.
   */
  egresos: number | null
  /** Este sí lo ve el empleado: sin él el efectivo esperado no se puede explicar. */
  egresosEfectivo: number
  /** Null para el empleado. */
  resultado: number | null
  /** Vacío para el empleado. */
  gastos: GastoResponse[]
  gastosAnulados: GastoResponse[]
  /** Ventas de mostrador del día: pelotas, bebidas, alquiler de paletas. */
  ventas: import('@/features/ventas/ventasApi').VentaResponse[]
  totalVentas: number
  /** Null mientras el día sigue abierto. */
  arqueo: Arqueo | null
  cobrosAnulados: CobroResponse[]
  ventasAnuladas: import('@/features/ventas/ventasApi').VentaResponse[]
}

export interface CierreCajaRequest {
  fecha: string
  efectivoContado: number
  notas: string | null
}

export const cajaApi = {
  async cobrar(reservaId: number, body: CobroRequest) {
    const { data } = await apiClient.post<CobroResponse>(`/api/reservas/${reservaId}/cobros`, body)
    return data
  },
  async cobrosDe(reservaId: number) {
    const { data } = await apiClient.get<CobroResponse[]>(`/api/reservas/${reservaId}/cobros`)
    return data
  },
  async anular(cobroId: number, motivo: string | null) {
    const { data } = await apiClient.delete<CobroResponse>(`/api/cobros/${cobroId}`, {
      params: { motivo: motivo || undefined },
    })
    return data
  },
  async cierre(fecha: string) {
    const { data } = await apiClient.get<CierreCaja>('/api/caja', { params: { fecha } })
    return data
  },
  async cerrar(body: CierreCajaRequest) {
    const { data } = await apiClient.post<CierreCaja>('/api/caja/cierre', body)
    return data
  },
  async reabrir(fecha: string) {
    const { data } = await apiClient.delete<CierreCaja>('/api/caja/cierre', { params: { fecha } })
    return data
  },
  async registrarGasto(body: GastoRequest) {
    const { data } = await apiClient.post<GastoResponse>('/api/gastos', body)
    return data
  },
  async gastosEntre(desde: string, hasta: string) {
    const { data } = await apiClient.get<GastoResponse[]>('/api/gastos', { params: { desde, hasta } })
    return data
  },
  /** Baja logica: la fila queda para poder auditarla, igual que los cobros anulados. */
  async anularGasto(id: number, motivo: string) {
    await apiClient.delete(`/api/gastos/${id}`, { params: { motivo } })
  },

  /** Declara el efectivo con el que arranca el cajon. Una vez por jornada. */
  async abrirCaja(body: MovimientoCajaRequest) {
    const { data } = await apiClient.post<MovimientoSuelto>('/api/movimientos-caja/apertura', body)
    return data
  },
  async registrarMovimiento(body: MovimientoCajaRequest) {
    const { data } = await apiClient.post<MovimientoSuelto>('/api/movimientos-caja', body)
    return data
  },
  /** Baja logica, y solo el dueno: si el que carga la plata puede borrarla, no hay auditoria. */
  async anularMovimiento(id: number, motivo: string) {
    await apiClient.delete(`/api/movimientos-caja/${id}`, { params: { motivo } })
  },
  /** Historial de arqueos firmados, reaperturas incluidas. Solo el dueno. */
  async historialCierres(pagina: number, tamanio: number) {
    const { data } = await apiClient.get<PaginaArqueos>('/api/caja/cierres', {
      params: { pagina, tamanio },
    })
    return data
  },
}
