import { apiClient } from '@/shared/api/apiClient'
import { CacheSimple } from '@/shared/lib/cache'

import type { JugadorFichaResponse, JugadorHistorialResponse, JugadorRequest, JugadorResponse } from '@/shared/types/api'

const _cache = new CacheSimple<JugadorResponse[]>()

export function invalidatePlayersCache() {
  _cache.invalidate()
}

/** Una página del listado, con el total para poder dibujar el paginador. */
export interface PaginaJugadores {
  contenido: JugadorResponse[]
  totalElementos: number
}

export const playersApi = {
  async getAll() {
    return _cache.fetch(() => apiClient.get<JugadorResponse[]>('/api/jugadores').then(({ data }) => data))
  },

  /**
   * Página del listado con la búsqueda y los filtros resueltos en el servidor. La pantalla
   * de jugadores usa esto y no `getAll`: traerse la tabla entera para mostrar ocho filas
   * es una respuesta que crece sin techo con cada torneo que pasa.
   */
  async getPagina(params: { busqueda?: string; genero?: string; categoriaId?: number | null; incluirBajas?: boolean; pagina: number; tamanio: number }) {
    const { data } = await apiClient.get<PaginaJugadores>('/api/jugadores/paginado', {
      params: {
        busqueda: params.busqueda?.trim() || undefined,
        genero: params.genero || undefined,
        categoriaId: params.categoriaId ?? undefined,
        incluirBajas: params.incluirBajas ? true : undefined,
        pagina: params.pagina,
        tamanio: params.tamanio,
      },
    })
    return data
  },

  /** Devuelve al listado a un jugador dado de baja. */
  async reactivar(id: number) {
    const { data } = await apiClient.patch<JugadorResponse>(`/api/jugadores/${id}/reactivar`)
    return data
  },

  async getById(id: number) {
    const { data } = await apiClient.get<JugadorResponse>(`/api/jugadores/${id}`)
    return data
  },

  async getHistorial(id: number) {
    const { data } = await apiClient.get<JugadorHistorialResponse>(`/api/jugadores/${id}/historial`)
    return data
  },

  async getFicha(id: number) {
    const { data } = await apiClient.get<JugadorFichaResponse>(`/api/jugadores/${id}/ficha`)
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
