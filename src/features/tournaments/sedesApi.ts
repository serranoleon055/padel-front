import { apiClient } from '@/shared/api/apiClient'
import type { PagoSedeRequest, TorneoSedeRequest, TorneoSedeResponse } from '@/shared/types/api'

/** Los clubes donde se juega un torneo, sus canchas, horarios y lo que se les paga. */
export const sedesApi = {
  async listar(torneoId: number) {
    const { data } = await apiClient.get<TorneoSedeResponse[]>(`/api/torneos/${torneoId}/sedes`)
    return data
  },

  async agregar(torneoId: number, body: TorneoSedeRequest) {
    const { data } = await apiClient.post<TorneoSedeResponse>(`/api/torneos/${torneoId}/sedes`, body)
    return data
  },

  async actualizar(torneoId: number, sedeId: number, body: TorneoSedeRequest) {
    const { data } = await apiClient.put<TorneoSedeResponse>(`/api/torneos/${torneoId}/sedes/${sedeId}`, body)
    return data
  },

  async quitar(torneoId: number, sedeId: number) {
    await apiClient.delete(`/api/torneos/${torneoId}/sedes/${sedeId}`)
  },

  async pagar(torneoId: number, sedeId: number, body: PagoSedeRequest) {
    const { data } = await apiClient.post<TorneoSedeResponse>(`/api/torneos/${torneoId}/sedes/${sedeId}/pagos`, body)
    return data
  },

  async anularPago(torneoId: number, sedeId: number, pagoId: number, motivo?: string) {
    const { data } = await apiClient.delete<TorneoSedeResponse>(`/api/torneos/${torneoId}/sedes/${sedeId}/pagos/${pagoId}`, { params: { motivo } })
    return data
  },
}
