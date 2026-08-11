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
  fecha: string
  categoria: CategoriaGasto
  descripcion: string
  monto: number
  medio: MedioPago
  proveedor: string | null
  registradoPor: string | null
  notas: string | null
}

export interface CierreCaja {
  fecha: string
  porMedio: TotalMedio[]
  efectivoEsperado: number
  totalMostrador: number
  seniasOnline: number
  totalDelDia: number
  turnosConSaldo: number
  saldoPendiente: number
  movimientos: CobroResponse[]
  egresos: number
  egresosEfectivo: number
  resultado: number
  gastos: GastoResponse[]
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
  async anular(cobroId: number) {
    await apiClient.delete(`/api/cobros/${cobroId}`)
  },
  async cierre(fecha: string) {
    const { data } = await apiClient.get<CierreCaja>('/api/caja', { params: { fecha } })
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
