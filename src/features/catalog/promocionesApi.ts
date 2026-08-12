import { apiClient } from '@/shared/api/apiClient'

export interface PromocionCanchaRequest {
  canchaId: number
  nombre: string
  diasSemana: string
  horaDesde: string
  horaHasta: string
  precioPorHora: number
  /** Null = arranca ya. */
  vigenteDesde: string | null
  /** Null = sigue hasta que la den de baja. */
  vigenteHasta: string | null
}

export interface PromocionCanchaResponse {
  id: number
  canchaId: number
  canchaNombre: string
  nombre: string
  diasSemana: string
  horaDesde: string
  horaHasta: string
  precioPorHora: number
  vigenteDesde: string | null
  vigenteHasta: string | null
  /** La promoción está corriendo hoy. */
  vigente: boolean
  activo: boolean
}

const NOMBRES_DIA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

/** "1,2,3,4,5" -> "Lun a Vie"; "6,7" -> "Sáb y Dom". */
export function describirDias(diasSemana: string): string {
  const dias = diasSemana.split(',').map((d) => Number(d.trim())).filter((d) => d >= 1 && d <= 7).sort()
  if (dias.length === 0) return ''
  if (dias.length === 7) return 'Todos los días'

  const consecutivos = dias.every((dia, i) => i === 0 || dia === dias[i - 1] + 1)
  if (consecutivos && dias.length > 2) {
    return `${NOMBRES_DIA[dias[0] - 1]} a ${NOMBRES_DIA[dias[dias.length - 1] - 1]}`
  }
  const nombres = dias.map((d) => NOMBRES_DIA[d - 1])
  if (nombres.length === 1) return nombres[0]
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`
}

export const promocionesApi = {
  async getAll(canchaId: number) {
    const { data } = await apiClient.get<PromocionCanchaResponse[]>('/api/promociones-cancha', { params: { canchaId } })
    return data
  },
  async create(body: PromocionCanchaRequest) {
    const { data } = await apiClient.post<PromocionCanchaResponse>('/api/promociones-cancha', body)
    return data
  },
  async update(id: number, body: PromocionCanchaRequest) {
    const { data } = await apiClient.put<PromocionCanchaResponse>(`/api/promociones-cancha/${id}`, body)
    return data
  },
  async remove(id: number) {
    await apiClient.delete(`/api/promociones-cancha/${id}`)
  },
}
