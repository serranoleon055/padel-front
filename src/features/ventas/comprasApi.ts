import { apiClient } from '@/shared/api/apiClient'
import type { MedioPago } from '@/features/caja/cajaApi'
import type { PagedResponse } from '@/shared/types/api'

/** Con qué papel vino la mercadería. Sirve para encontrarla cuando el club lo tiene en la mano. */
export type TipoComprobanteCompra = 'FACTURA_A' | 'FACTURA_B' | 'FACTURA_C' | 'REMITO' | 'TICKET' | 'OTRO'

export const TIPOS_COMPROBANTE: { valor: TipoComprobanteCompra; nombre: string }[] = [
  { valor: 'FACTURA_A', nombre: 'Factura A' },
  { valor: 'FACTURA_B', nombre: 'Factura B' },
  { valor: 'FACTURA_C', nombre: 'Factura C' },
  { valor: 'REMITO', nombre: 'Remito' },
  { valor: 'TICKET', nombre: 'Ticket' },
  { valor: 'OTRO', nombre: 'Otro' },
]

export interface CompraRequest {
  proveedorId: number
  tipoComprobante: TipoComprobanteCompra
  numero: string
  /** La del comprobante: es el mes al que pesa la compra, no el día en que se carga. */
  fecha: string
  /** Null = queda a cuenta corriente: la mercadería entró pero la plata no salió. */
  medio: MedioPago | null
  items: { productoId: number; cantidad: number; costoUnitario: number }[]
  notas?: string | null
}

export interface CompraResponse {
  id: number
  proveedorId: number
  proveedorNombre: string
  tipoComprobante: TipoComprobanteCompra
  numero: string
  fecha: string
  jornada: string
  total: number
  medio: MedioPago | null
  quedaACuenta: boolean
  registradoPor: string | null
  notas: string | null
  items: { productoId: number; productoNombre: string; cantidad: number; costoUnitario: number; subtotal: number }[]
  anuladoEn: string | null
  anuladoPor: string | null
  motivoAnulacion: string | null
}

export interface CuentaProveedorResponse {
  proveedorId: number
  proveedorNombre: string
  comprasACredito: number
  pagado: number
  /**
   * Positivo = el club le debe. Negativo = hay saldo a favor del club, que pasa cuando se
   * anula una compra ya pagada: la plata queda para descontar de la próxima.
   */
  saldo: number
  movimientos: {
    fecha: string
    tipo: 'COMPRA' | 'PAGO'
    descripcion: string
    monto: number
    saldoAcumulado: number
  }[]
}

export interface PagoProveedorRequest {
  fecha: string
  monto: number
  medio: MedioPago
  notas?: string | null
}

export const comprasApi = {
  async registrar(body: CompraRequest) {
    const { data } = await apiClient.post<CompraResponse>('/api/compras', body)
    return data
  },
  async listar(proveedorId: number | null, pagina: number, tamanio = 20) {
    const { data } = await apiClient.get<PagedResponse<CompraResponse>>('/api/compras', {
      params: { proveedorId: proveedorId ?? undefined, pagina, tamanio },
    })
    return data
  },
  async obtener(id: number) {
    const { data } = await apiClient.get<CompraResponse>(`/api/compras/${id}`)
    return data
  },
  /** Devuelve el stock y anula el egreso. Los movimientos originales quedan. */
  async anular(id: number, motivo: string | null) {
    await apiClient.delete(`/api/compras/${id}`, { params: { motivo: motivo || undefined } })
  },
}

export const cuentaProveedorApi = {
  async cuenta(proveedorId: number) {
    const { data } = await apiClient.get<CuentaProveedorResponse>(`/api/proveedores/${proveedorId}/cuenta`)
    return data
  },
  /** Esto sí sale del cajón: la compra a cuenta no. */
  async pagar(proveedorId: number, body: PagoProveedorRequest) {
    const { data } = await apiClient.post<CuentaProveedorResponse>(`/api/proveedores/${proveedorId}/pagos`, body)
    return data
  },
  async anularPago(pagoId: number, motivo: string | null) {
    await apiClient.delete(`/api/proveedores/pagos/${pagoId}`, { params: { motivo: motivo || undefined } })
  },
}
