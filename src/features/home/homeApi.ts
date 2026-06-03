import { apiClient } from '@/shared/api/apiClient'

import type { AdminDashboardResponse, HomeResponse, HomeSummaryResponse, PartidoResponse } from '@/shared/types/api'

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

  async getAdminDashboard() {
    const { data } = await apiClient.get<AdminDashboardResponse>('/api/home/admin-dashboard')
    return data
  },
}
