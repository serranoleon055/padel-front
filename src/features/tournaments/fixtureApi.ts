import { apiClient } from '@/shared/api/apiClient'
import type { FixtureResponse, PropuestaFixture, ReglasFixture } from '@/shared/types/api'

/** Los horarios del torneo: armado automático, ajuste a mano y conflictos. */
export const fixtureApi = {
  async agenda(torneoId: number) {
    const { data } = await apiClient.get<FixtureResponse>(`/api/torneos/${torneoId}/fixture`)
    return data
  },

  async reglas(torneoId: number) {
    const { data } = await apiClient.get<ReglasFixture>(`/api/torneos/${torneoId}/fixture/reglas`)
    return data
  },

  async guardarReglas(torneoId: number, body: ReglasFixture) {
    const { data } = await apiClient.put<ReglasFixture>(`/api/torneos/${torneoId}/fixture/reglas`, body)
    return data
  },

  async proponer(torneoId: number, body: { desde: string | null; reprogramar: boolean; categoriaId: number | null }) {
    const { data } = await apiClient.post<PropuestaFixture>(`/api/torneos/${torneoId}/fixture/propuesta`, body)
    return data
  },

  async aplicar(torneoId: number, asignaciones: { partidoId: number; canchaId: number; inicio: string }[]) {
    const { data } = await apiClient.post<FixtureResponse>(`/api/torneos/${torneoId}/fixture/aplicar`, { asignaciones })
    return data
  },

  async mover(torneoId: number, partidoId: number, body: { canchaId: number; inicio: string }) {
    const { data } = await apiClient.put<FixtureResponse>(`/api/torneos/${torneoId}/fixture/partidos/${partidoId}`, body)
    return data
  },

  async desprogramar(torneoId: number, partidoId: number) {
    const { data } = await apiClient.delete<FixtureResponse>(`/api/torneos/${torneoId}/fixture/partidos/${partidoId}`)
    return data
  },
}
