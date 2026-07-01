import { apiClient } from '@/shared/api/apiClient'

import type { AdminDashboardResponse, CampeonResponse, Genero, HomeResponse, HomeSummaryResponse, PagedResponse, PartidoResponse } from '@/shared/types/api'

export function invalidateHomeCache() {
}

export const homeApi = {
  async getHome() {
    const { data } = await apiClient.get<HomeResponse>('/api/home')
    return data
  },

  async getSummary() {
    const { data } = await apiClient.get<HomeSummaryResponse>('/api/home/summary')
    return data
  },

  async getProximosPartidos() {
    const { data } = await apiClient.get<PartidoResponse[]>('/api/partidos/proximos')
    return data
  },

  async getAdminDashboard(lugarId?: number) {
    const { data } = await apiClient.get<AdminDashboardResponse>('/api/home/admin-dashboard', {
      params: lugarId != null ? { lugarId } : undefined,
    })
    return data
  },

  async getCampeones(params: { categoriaId?: number; genero?: Genero; pagina?: number; tamanio?: number } = {}) {
    const { data } = await apiClient.get<PagedResponse<CampeonResponse>>('/api/home/campeones', { params })
    return data
  },
}
