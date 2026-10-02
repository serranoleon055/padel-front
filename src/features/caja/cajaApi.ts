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
  async eliminarGasto(id: number) {
    await apiClient.delete(`/api/gastos/${id}`)
  },
}
