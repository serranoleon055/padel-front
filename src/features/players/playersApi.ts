import { apiClient } from '@/shared/api/apiClient'
import { CacheSimple } from '@/shared/lib/cache'

import type { JugadorHistorialResponse, JugadorRequest, JugadorResponse } from '@/shared/types/api'

const _cache = new CacheSimple<JugadorResponse[]>()

export function invalidatePlayersCache() {
  _cache.invalidate()
}

export const playersApi = {
  async getAll() {
    return _cache.fetch(() => apiClient.get<JugadorResponse[]>('/api/jugadores').then(({ data }) => data))
  },

  async getById(id: number) {
    const { data } = await apiClient.get<JugadorResponse>(`/api/jugadores/${id}`)
    return data
  },

  async getHistorial(id: number) {
    const { data } = await apiClient.get<JugadorHistorialResponse>(`/api/jugadores/${id}/historial`)
    return data
  },

  async create(payload: JugadorRequest) {
    const { data } = await apiClient.post<JugadorResponse>('/api/jugadores', payload)
    invalidatePlayersCache()
    return data
  },

  async update(id: number, payload: JugadorRequest) {
    const { data } = await apiClient.put<JugadorResponse>(`/api/jugadores/${id}`, payload)
    invalidatePlayersCache()
    return data
  },

  async uploadPhoto(id: number, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await apiClient.post<JugadorResponse>(`/api/jugadores/${id}/foto`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    invalidatePlayersCache()
    return data
  },

  async removePhoto(id: number) {
    const { data } = await apiClient.delete<JugadorResponse>(`/api/jugadores/${id}/foto`)
    invalidatePlayersCache()
    return data
  },

  async remove(id: number) {
    await apiClient.delete(`/api/jugadores/${id}`)
    invalidatePlayersCache()
  },

  async removeBatch(ids: number[]) {
    await apiClient.post('/api/jugadores/delete-batch', { ids })
    invalidatePlayersCache()
  },
}
