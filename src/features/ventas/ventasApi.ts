import { apiClient } from '@/shared/api/apiClient'
import type { MedioPago } from '@/features/caja/cajaApi'

export type CategoriaProducto =
  | 'PELOTAS' | 'PALETAS' | 'ALQUILER' | 'INDUMENTARIA'
  | 'BEBIDAS' | 'KIOSCO' | 'ACCESORIOS' | 'OTRO'

export const CATEGORIAS_PRODUCTO: { valor: CategoriaProducto; nombre: string }[] = [
  { valor: 'PELOTAS', nombre: 'Pelotas' },
  { valor: 'PALETAS', nombre: 'Paletas' },
  { valor: 'ALQUILER', nombre: 'Alquiler' },
  { valor: 'INDUMENTARIA', nombre: 'Indumentaria' },
  { valor: 'BEBIDAS', nombre: 'Bebidas' },
  { valor: 'KIOSCO', nombre: 'Kiosco' },
  { valor: 'ACCESORIOS', nombre: 'Accesorios' },
  { valor: 'OTRO', nombre: 'Otro' },
]

export const MOTIVOS_STOCK: Record<string, string> = {
  VENTA: 'Venta',
  COMPRA: 'Compra',
  AJUSTE: 'Ajuste',
  ANULACION: 'Anulación',
  MERMA: 'Merma',
}

export interface ProductoRequest {
  nombre: string
  categoria: CategoriaProducto
  precioVenta: number
  costo: number | null
  controlaStock: boolean
  stockInicial?: number | null
  stockMinimo: number
  proveedorId: number | null
  activo?: boolean
}

export interface ProductoResponse {
  id: number
  nombre: string
  categoria: CategoriaProducto
  precioVenta: number
  costo: number | null
  /** Ganancia por unidad. Null mientras no se cargue el costo. */
  margenUnitario: number | null
  controlaStock: boolean
  stock: number
  stockMinimo: number
  necesitaReposicion: boolean
  proveedorId: number | null
  proveedorNombre: string | null
  activo: boolean
}

export interface ProveedorRequest {
  nombre: string
  telefono: string | null
  notas: string | null
  activo?: boolean
}

export interface ProveedorResponse {
  id: number
  nombre: string
  telefono: string | null
  notas: string | null
  activo: boolean
  productos: number
}

export interface MovimientoStockRequest {
  cantidad: number
  costoUnitario?: number | null
  medioPago?: MedioPago | null
  fecha?: string | null
  notas?: string | null
}

export interface MovimientoStockResponse {
  id: number
  productoId: number
  productoNombre: string
  cantidad: number
  motivo: keyof typeof MOTIVOS_STOCK
  fecha: string
  costoUnitario: number | null
  registradoPor: string | null
  notas: string | null
}

export interface VentaRequest {
  items: { productoId: number; cantidad: number }[]
  /** Null = va a la cuenta del turno y se cobra al final; exige reservaId. */
  medio: MedioPago | null
  clienteId?: number | null
  reservaId?: number | null
  notas?: string | null
}

export interface VentaResponse {
  id: number
  fecha: string
  total: number
  /** Null = quedó anotada en la cuenta de un turno, todavía sin cobrar. */
  medio: MedioPago | null
  clienteId: number | null
  clienteNombre: string | null
  reservaId: number | null
  registradoPor: string | null
  notas: string | null
  items: { productoId: number; productoNombre: string; cantidad: number; precioUnitario: number; subtotal: number }[]
  /** "2 x Pelotas Head, 1 x Gatorade". */
  detalle: string
  /** Con fecha, la venta está anulada y no suma en ningún total. */
  anuladoEn: string | null
  anuladoPor: string | null
  motivoAnulacion: string | null
}

export const productosApi = {
  async getAll(busqueda?: string, soloActivos = true) {
    const { data } = await apiClient.get<ProductoResponse[]>('/api/productos', {
      params: { busqueda: busqueda || undefined, soloActivos },
    })
    return data
  },
  async stockBajo() {
    const { data } = await apiClient.get<ProductoResponse[]>('/api/productos/stock-bajo')
    return data
  },
  async create(body: ProductoRequest) {
    const { data } = await apiClient.post<ProductoResponse>('/api/productos', body)
    return data
  },
  async update(id: number, body: ProductoRequest) {
    const { data } = await apiClient.put<ProductoResponse>(`/api/productos/${id}`, body)
    return data
  },
  async remove(id: number) {
    await apiClient.delete(`/api/productos/${id}`)
  },
  async movimientos(id: number) {
    const { data } = await apiClient.get<MovimientoStockResponse[]>(`/api/productos/${id}/movimientos`)
    return data
  },
  /** Historial de compras de todo el club, no de un producto. */
  async compras() {
    const { data } = await apiClient.get<MovimientoStockResponse[]>('/api/productos/compras')
    return data
  },
  async comprar(id: number, body: MovimientoStockRequest) {
    const { data } = await apiClient.post<ProductoResponse>(`/api/productos/${id}/compras`, body)
    return data
  },
  async ajustar(id: number, stockReal: number, notas: string | null) {
    const { data } = await apiClient.post<ProductoResponse>(`/api/productos/${id}/ajustes`, { stockReal, notas })
    return data
  },
  async registrarMerma(id: number, body: MovimientoStockRequest) {
    const { data } = await apiClient.post<ProductoResponse>(`/api/productos/${id}/mermas`, body)
    return data
  },
}

export const proveedoresApi = {
  async getAll(soloActivos = true) {
    const { data } = await apiClient.get<ProveedorResponse[]>('/api/proveedores', { params: { soloActivos } })
    return data
  },
  async create(body: ProveedorRequest) {
    const { data } = await apiClient.post<ProveedorResponse>('/api/proveedores', body)
    return data
  },
  async update(id: number, body: ProveedorRequest) {
    const { data } = await apiClient.put<ProveedorResponse>(`/api/proveedores/${id}`, body)
    return data
  },
  async remove(id: number) {
    await apiClient.delete(`/api/proveedores/${id}`)
  },
}

export const ventasApi = {
  async registrar(body: VentaRequest) {
    const { data } = await apiClient.post<VentaResponse>('/api/ventas', body)
    return data
  },
  async delDia(fecha: string) {
    const { data } = await apiClient.get<VentaResponse[]>('/api/ventas', { params: { fecha } })
    return data
  },
  /** `confirmado` acepta anular un consumo que el turno ya pagó. */
  async anular(id: number, motivo: string | null, confirmado = false) {
    const { data } = await apiClient.delete<VentaResponse>(`/api/ventas/${id}`, {
      params: { motivo: motivo || undefined, confirmado },
    })
    return data
  },
}
