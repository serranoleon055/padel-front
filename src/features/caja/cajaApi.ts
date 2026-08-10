import { apiClient } from '@/shared/api/apiClient'

export type MedioCobro = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'MERCADO_PAGO' | 'OTRO'

export const MEDIOS: { valor: MedioCobro; nombre: string }[] = [
  { valor: 'EFECTIVO', nombre: 'Efectivo' },
  { valor: 'TRANSFERENCIA', nombre: 'Transferencia' },
  { valor: 'TARJETA', nombre: 'Tarjeta' },
  { valor: 'MERCADO_PAGO', nombre: 'Mercado Pago' },
  { valor: 'OTRO', nombre: 'Otro' },
]

export interface CobroRequest {
  monto: number
  medio: MedioCobro
  notas: string | null
}

export interface CobroResponse {
  id: number
  reservaId: number
  monto: number
  medio: MedioCobro
  cobradoEn: string
  registradoPor: string | null
  notas: string | null
  clienteNombre: string | null
  canchaNombre: string | null
}

export interface TotalMedio {
  medio: MedioCobro
  cantidad: number
  total: number
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
}
