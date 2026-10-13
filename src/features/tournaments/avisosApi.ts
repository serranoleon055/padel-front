import { apiClient } from '@/shared/api/apiClient'

export type AvisoEnviado = { jugadorId: number; tema: string; clave: string; enviadoEn: string; enviadoPor: string | null }

/** A quién ya se le avisó por WhatsApp y con qué mensaje. */
export const avisosApi = {
  async listar(torneoId: number) {
    const { data } = await apiClient.get<AvisoEnviado[]>(`/api/torneos/${torneoId}/avisos`)
    return data
  },

  async registrar(torneoId: number, body: { jugadorId: number; tema: string; clave: string }) {
    const { data } = await apiClient.post<AvisoEnviado>(`/api/torneos/${torneoId}/avisos`, body)
    return data
  },
}
