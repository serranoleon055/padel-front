import { apiClient } from '@/shared/api/apiClient'
import type { DisponibilidadPareja, RestriccionHoraria } from '@/shared/types/api'

/** Cuándo no puede jugar cada pareja del torneo. */
export const disponibilidadApi = {
  async listar(torneoId: number) {
    const { data } = await apiClient.get<DisponibilidadPareja[]>(`/api/torneos/${torneoId}/disponibilidad`)
    return data
  },

  async actualizar(torneoId: number, parejaId: number, body: { restricciones: RestriccionHoraria[]; notas: string | null }) {
    const { data } = await apiClient.put<DisponibilidadPareja>(`/api/torneos/${torneoId}/disponibilidad/${parejaId}`, body)
    return data
  },
}
