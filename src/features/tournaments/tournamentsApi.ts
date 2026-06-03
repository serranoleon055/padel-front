import { apiClient } from '@/shared/api/apiClient'
import { invalidateHomeCache } from '@/features/home/homeApi'
import { invalidateRankingCache } from '@/features/ranking/rankingApi'
import { CacheSimple } from '@/shared/lib/cache'

import type {
  CambioEstadoRequest,
  GrupoResponse,
  ParejaRequest,
  ParejaResponse,
  PartidoResponse,
  ResultadoRequest,
  TorneoDetalleResponse,
  TorneoRequest,
  TorneoResponse,
} from '@/shared/types/api'

const _cache = new CacheSimple<TorneoResponse[]>()

export function invalidateTournamentsCache() {
  _cache.invalidate()
}

export const tournamentsApi = {
  async getAll() {
    return _cache.fetch(() => apiClient.get<TorneoResponse[]>('/api/torneos').then(({ data }) => data))
  },

  async getById(id: number) {
    const { data } = await apiClient.get<TorneoResponse>(`/api/torneos/${id}`)
    return data
  },

  async getDetail(id: number) {
    const { data } = await apiClient.get<TorneoDetalleResponse>(`/api/torneos/${id}/detalle`)
    return data
  },

  async getPairs(id: number) {
    const { data } = await apiClient.get<ParejaResponse[]>(`/api/torneos/${id}/parejas`)
    return data
  },

  async getMatches(id: number) {
    const { data } = await apiClient.get<PartidoResponse[]>(`/api/torneos/${id}/partidos`)
    return data
  },

  async getGroups(id: number) {
    const { data } = await apiClient.get<GrupoResponse[]>(`/api/torneos/${id}/grupos`)
    return data
  },

  async create(payload: TorneoRequest) {
    const { data } = await apiClient.post<TorneoResponse>('/api/torneos', payload)
    invalidateTournamentsCache()
    invalidateHomeCache()
    return data
  },

  async update(id: number, payload: TorneoRequest) {
    const { data } = await apiClient.put<TorneoResponse>(`/api/torneos/${id}`, payload)
    invalidateTournamentsCache()
    invalidateHomeCache()
    return data
  },

  async uploadImage(id: number, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await apiClient.post<TorneoResponse>(`/api/torneos/${id}/imagen`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    invalidateTournamentsCache()
    invalidateHomeCache()
    return data
  },

  async remove(id: number) {
    await apiClient.delete(`/api/torneos/${id}`)
    invalidateTournamentsCache()
    invalidateHomeCache()
  },

  async changeStatus(id: number, payload: CambioEstadoRequest) {
    const { data } = await apiClient.patch<TorneoResponse>(`/api/torneos/${id}/estado`, payload)
    invalidateTournamentsCache()
    invalidateHomeCache()
    return data
  },

  async addPair(id: number, payload: ParejaRequest) {
    const { data } = await apiClient.post<ParejaResponse>(`/api/torneos/${id}/parejas`, payload)
    invalidateTournamentsCache()
    invalidateHomeCache()
    return data
  },

  async removePair(id: number, pairId: number) {
    await apiClient.delete(`/api/torneos/${id}/parejas/${pairId}`)
    invalidateTournamentsCache()
    invalidateHomeCache()
  },

  async generateDraw(id: number) {
    await apiClient.post(`/api/torneos/${id}/sorteo`)
    invalidateTournamentsCache()
    invalidateHomeCache()
  },

  async startMatch(id: number, matchId: number) {
    const { data } = await apiClient.patch<PartidoResponse>(`/api/torneos/${id}/partidos/${matchId}/iniciar`)
    invalidateHomeCache()
    return data
  },

  async loadResult(id: number, matchId: number, payload: ResultadoRequest) {
    const { data } = await apiClient.put<PartidoResponse>(`/api/torneos/${id}/partidos/${matchId}/resultado`, payload)
    invalidateTournamentsCache()
    invalidateHomeCache()
    invalidateRankingCache()
    return data
  },

  async getCalendario(id: number) {
    const { data } = await apiClient.get<PartidoResponse[]>(`/api/torneos/${id}/calendario`)
    return data
  },

  async retirarPareja(id: number, parejaId: number) {
    await apiClient.patch(`/api/torneos/${id}/parejas/${parejaId}/retirar`, {})
    invalidateTournamentsCache()
    invalidateHomeCache()
    invalidateRankingCache()
  },

  async scheduleMatch(id: number, matchId: number, payload: { fechaHora: string; canchaId?: number | null }) {
    const { data } = await apiClient.patch<PartidoResponse>(`/api/torneos/${id}/partidos/${matchId}/programar`, payload)
    invalidateHomeCache()
    return data
  },

  async declareWalkover(id: number, matchId: number, payload: { ganadorParejaId: number; tipo: 'WALKOVER' | 'RETIRO'; motivo?: string }) {
    const { data } = await apiClient.patch<PartidoResponse>(`/api/torneos/${id}/partidos/${matchId}/walkover`, payload)
    invalidateTournamentsCache()
    invalidateHomeCache()
    invalidateRankingCache()
    return data
  },
}
