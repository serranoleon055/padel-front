import { apiClient } from '@/shared/api/apiClient'
import type { PagedResponse } from '@/shared/types/api'

export interface RecuentoItemResponse {
  id: number
  productoId: number
  productoNombre: string
  categoria: string | null
  /** Lo que decía el sistema cuando el renglón entró a la planilla. */
  stockSistema: number
  /** Null = todavía no se contó. Es distinto de cero, que es "no quedaba ninguno". */
  stockContado: number | null
  /** Positiva si sobró, negativa si faltó. */
  diferencia: number
  costoUnitario: number | null
  /** Lo que vale la diferencia. Null si el producto no tiene costo cargado. */
  valorizada: number | null
}

export interface RecuentoResponse {
  id: number
  fecha: string
  estado: 'BORRADOR' | 'APLICADO'
  notas: string | null
  creadoEn: string
  creadoPor: string | null
  aplicadoEn: string | null
  aplicadoPor: string | null
  /** En borrador es lo que se perdería al aplicar; aplicado, queda congelado. */
  faltanteValorizado: number
  sobranteValorizado: number
  contados: number
  total: number
  /** Solo viene en el detalle, no en el listado. */
  items?: RecuentoItemResponse[]
}

export const recuentosApi = {
  /** `productoIds` vacío = todos los que llevan stock. */
  async abrir(fecha: string, notas?: string | null, productoIds?: number[]) {
    const { data } = await apiClient.post<RecuentoResponse>('/api/recuentos', {
      fecha, notas: notas || null, productoIds: productoIds ?? null,
    })
    return data
  },
  /** Devuelve null si no hay ninguno abierto (el backend contesta 204). */
  async enCurso() {
    const { data } = await apiClient.get<RecuentoResponse | ''>('/api/recuentos/en-curso')
    return data || null
  },
  async obtener(id: number) {
    const { data } = await apiClient.get<RecuentoResponse>(`/api/recuentos/${id}`)
    return data
  },
  async listar(pagina = 0, tamanio = 20) {
    const { data } = await apiClient.get<PagedResponse<RecuentoResponse>>('/api/recuentos', {
      params: { pagina, tamanio },
    })
    return data
  },
  /** Anota lo contado. No toca el stock: eso pasa al aplicar. */
  async contar(id: number, items: { itemId: number; stockContado: number | null }[]) {
    const { data } = await apiClient.put<RecuentoResponse>(`/api/recuentos/${id}/conteo`, { items })
    return data
  },
  async aplicar(id: number) {
    const { data } = await apiClient.post<RecuentoResponse>(`/api/recuentos/${id}/aplicar`)
    return data
  },
  async descartar(id: number) {
    await apiClient.delete(`/api/recuentos/${id}`)
  },
}
