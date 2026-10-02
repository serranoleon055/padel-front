import { apiClient } from '@/shared/api/apiClient'

import type { EstadisticasResponse } from '@/shared/types/api'

/**
 * Ventanas que ofrece la pantalla. El backend acepta cualquier número entre 1 y 24; acá
 * están las tres que tienen sentido mirar: el trimestre, el semestre y el año.
 */
export const VENTANAS_PANEL: { meses: number; nombre: string }[] = [
  { meses: 3, nombre: '3 meses' },
  { meses: 6, nombre: '6 meses' },
  { meses: 12, nombre: '12 meses' },
]

export const estadisticasApi = {
  async obtener(lugarId?: number, meses?: number) {
    const { data } = await apiClient.get<EstadisticasResponse>('/api/estadisticas', {
      params: {
        ...(lugarId != null ? { lugarId } : {}),
        ...(meses != null ? { meses } : {}),
      },
    })
    return data
  },
}
