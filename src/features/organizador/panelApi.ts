import { apiClient } from '@/shared/api/apiClient'
import type { PanelOrganizador } from '@/shared/types/api'

export const panelOrganizadorApi = {
  async obtener() {
    const { data } = await apiClient.get<PanelOrganizador>('/api/organizador/panel')
    return data
  },
}
