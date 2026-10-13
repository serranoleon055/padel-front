import { apiClient } from '@/shared/api/apiClient'
import type { CuentaInscripcionesResponse, PagoJugadorRequest } from '@/shared/types/api'

/** Quién pagó la inscripción de un torneo y quién debe, jugador por jugador. */
export const cobrosApi = {
  async cuenta(torneoId: number) {
    const { data } = await apiClient.get<CuentaInscripcionesResponse>(`/api/torneos/${torneoId}/cobros-inscripcion`)
    return data
  },

  async cobrar(torneoId: number, parejaId: number, body: PagoJugadorRequest) {
    const { data } = await apiClient.post<CuentaInscripcionesResponse>(`/api/torneos/${torneoId}/cobros-inscripcion/parejas/${parejaId}`, body)
    return data
  },

  async anular(torneoId: number, pagoId: number, motivo?: string) {
    const { data } = await apiClient.delete<CuentaInscripcionesResponse>(`/api/torneos/${torneoId}/cobros-inscripcion/${pagoId}`, { params: { motivo } })
    return data
  },
}
