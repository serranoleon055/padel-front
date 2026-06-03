import { apiClient } from '@/shared/api/apiClient'

import type {
  PlantillaFormatoRequest,
  PlantillaFormatoResponse,
  PlantillaPuntosRequest,
  PlantillaPuntosResponse,
} from '@/shared/types/api'

let _cachedFormatTemplates: PlantillaFormatoResponse[] | null = null
let _cachedPointTemplates: PlantillaPuntosResponse[] | null = null

export function invalidateTemplatesCache() {
  _cachedFormatTemplates = null
  _cachedPointTemplates = null
}

export const formatTemplatesApi = {
  async getAll(soloActivas = false) {
    if (soloActivas && _cachedFormatTemplates) return _cachedFormatTemplates
    const { data } = await apiClient.get<PlantillaFormatoResponse[]>('/api/plantillas-formato', { params: { soloActivas } })
    if (soloActivas) _cachedFormatTemplates = data
    return data
  },

  async create(payload: PlantillaFormatoRequest) {
    const { data } = await apiClient.post<PlantillaFormatoResponse>('/api/plantillas-formato', payload)
    invalidateTemplatesCache()
    return data
  },

  async update(id: number, payload: PlantillaFormatoRequest) {
    const { data } = await apiClient.put<PlantillaFormatoResponse>(`/api/plantillas-formato/${id}`, payload)
    invalidateTemplatesCache()
    return data
  },

  async remove(id: number) {
    await apiClient.delete(`/api/plantillas-formato/${id}`)
    invalidateTemplatesCache()
  },
}

export const pointTemplatesApi = {
  async getAll(soloActivas = false) {
    if (soloActivas && _cachedPointTemplates) return _cachedPointTemplates
    const { data } = await apiClient.get<PlantillaPuntosResponse[]>('/api/plantillas-puntos', { params: { soloActivas } })
    if (soloActivas) _cachedPointTemplates = data
    return data
  },

  async create(payload: PlantillaPuntosRequest) {
    const { data } = await apiClient.post<PlantillaPuntosResponse>('/api/plantillas-puntos', payload)
    invalidateTemplatesCache()
    return data
  },

  async update(id: number, payload: PlantillaPuntosRequest) {
    const { data } = await apiClient.put<PlantillaPuntosResponse>(`/api/plantillas-puntos/${id}`, payload)
    invalidateTemplatesCache()
    return data
  },

  async remove(id: number) {
    await apiClient.delete(`/api/plantillas-puntos/${id}`)
    invalidateTemplatesCache()
  },
}
