import { apiClient } from '@/shared/api/apiClient'
import type { CategoriaGastoTorneo, FinanzasTorneo, MedioDePago } from '@/shared/types/api'

export type PremioRequest = { categoriaId: number | null; puesto: string; descripcion: string | null; monto: number | null }
export type GastoRequest = { fecha: string; categoria: CategoriaGastoTorneo; descripcion: string | null; monto: number; medio: MedioDePago }
export type AporteRequest = {
  sponsorId: number | null
  nombre: string | null
  monto: number | null
  descripcion: string | null
  cobrado: boolean
  cobradoEn: string | null
  medio: MedioDePago | null
}

/** La plata del torneo: premios, gastos, sponsors y balance. Solo el dueño. */
export const finanzasApi = {
  async obtener(torneoId: number) {
    const { data } = await apiClient.get<FinanzasTorneo>(`/api/torneos/${torneoId}/finanzas`)
    return data
  },
  async agregarPremio(torneoId: number, body: PremioRequest) {
    const { data } = await apiClient.post<FinanzasTorneo>(`/api/torneos/${torneoId}/finanzas/premios`, body)
    return data
  },
  async editarPremio(torneoId: number, premioId: number, body: PremioRequest) {
    const { data } = await apiClient.put<FinanzasTorneo>(`/api/torneos/${torneoId}/finanzas/premios/${premioId}`, body)
    return data
  },
  async entregarPremio(torneoId: number, premioId: number, body: { entregado: boolean; entregadoA: string | null }) {
    const { data } = await apiClient.patch<FinanzasTorneo>(`/api/torneos/${torneoId}/finanzas/premios/${premioId}/entrega`, body)
    return data
  },
  async quitarPremio(torneoId: number, premioId: number) {
    const { data } = await apiClient.delete<FinanzasTorneo>(`/api/torneos/${torneoId}/finanzas/premios/${premioId}`)
    return data
  },
  async registrarGasto(torneoId: number, body: GastoRequest) {
    const { data } = await apiClient.post<FinanzasTorneo>(`/api/torneos/${torneoId}/finanzas/gastos`, body)
    return data
  },
  async anularGasto(torneoId: number, gastoId: number, motivo: string) {
    const { data } = await apiClient.delete<FinanzasTorneo>(`/api/torneos/${torneoId}/finanzas/gastos/${gastoId}`, { params: { motivo } })
    return data
  },
  async agregarAporte(torneoId: number, body: AporteRequest) {
    const { data } = await apiClient.post<FinanzasTorneo>(`/api/torneos/${torneoId}/finanzas/aportes`, body)
    return data
  },
  async editarAporte(torneoId: number, aporteId: number, body: AporteRequest) {
    const { data } = await apiClient.put<FinanzasTorneo>(`/api/torneos/${torneoId}/finanzas/aportes/${aporteId}`, body)
    return data
  },
  async quitarAporte(torneoId: number, aporteId: number) {
    const { data } = await apiClient.delete<FinanzasTorneo>(`/api/torneos/${torneoId}/finanzas/aportes/${aporteId}`)
    return data
  },
}
