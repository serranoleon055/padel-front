import { apiClient } from '@/shared/api/apiClient'

import type { EstadisticasResponse } from '@/shared/types/api'

export const estadisticasApi = {
  async obtener(lugarId?: number) {
    const { data } = await apiClient.get<EstadisticasResponse>('/api/estadisticas', {
      params: lugarId != null ? { lugarId } : undefined,
    })
    return data
  },
}
