import { apiClient } from '@/shared/api/apiClient'

import type { Genero, PagedResponse, RankingResponse } from '@/shared/types/api'

export type RankingFilters = {
  categoriaId?: number
  genero?: Genero
}

export function invalidateRankingCache() {
}

export const rankingApi = {
  async getRanking(filters: RankingFilters = {}) {
    const { data } = await apiClient.get<RankingResponse[]>('/api/ranking', { params: filters })
    return data
  },

  async getRankingPaginado(filtros: RankingFilters & { pagina?: number; tamanio?: number } = {}) {
    const { data } = await apiClient.get<PagedResponse<RankingResponse>>('/api/ranking/paginado', {
      params: { categoriaId: filtros.categoriaId, genero: filtros.genero, pagina: filtros.pagina, tamanio: filtros.tamanio },
    })
    return data
  },

  async recalcularPuntos() {
    const { data } = await apiClient.post<string>('/api/ranking/recalcular')
    return data
  },
}
