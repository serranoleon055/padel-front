import { apiClient } from '@/shared/api/apiClient'
import type { ConfiguracionSede } from '@/shared/types/api'

export interface EstadoNotificaciones {
  servidorConfigurado: boolean
  destino: string | null
  origenDestino: 'sede' | 'variable' | null
  activo: boolean
}

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

  async estadoNotificaciones() {
    const { data } = await apiClient.get<EstadoNotificaciones>('/api/configuracion-sede/notificaciones')
    return data
  },

  async probarNotificaciones() {
    const { data } = await apiClient.post<{ destino: string }>('/api/configuracion-sede/notificaciones/prueba')
    return data.destino
  },
}
