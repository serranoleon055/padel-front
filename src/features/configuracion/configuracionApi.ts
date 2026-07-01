import { apiClient } from '@/shared/api/apiClient'
import type { ConfiguracionSede } from '@/shared/types/api'

export const configuracionSedeApi = {
  async get() {
    const { data } = await apiClient.get<ConfiguracionSede>('/api/configuracion-sede')
    return data
  },

  async update(payload: ConfiguracionSede) {
    const { data } = await apiClient.put<ConfiguracionSede>('/api/configuracion-sede', payload)
    return data
  },

  async subirImagenGaleria(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await apiClient.post<{ url: string }>('/api/configuracion-sede/galeria/imagen', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.url
  },
}
