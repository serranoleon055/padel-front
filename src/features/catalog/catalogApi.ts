import { apiClient } from '@/shared/api/apiClient'
import { CacheSimple } from '@/shared/lib/cache'

import type {
  CanchaResponse,
  CategoriaRequest,
  CategoriaResponse,
  LugarRequest,
  LugarResponse,
  TemporadaRequest,
  TemporadaResponse,
} from '@/shared/types/api'

const _categoriesCache = new CacheSimple<CategoriaResponse[]>()

export function invalidateCategoriesCache() {
  _categoriesCache.invalidate()
}

export const categoriesApi = {
  async getAll() {
    return _categoriesCache.fetch(() => apiClient.get<CategoriaResponse[]>('/api/categorias').then(({ data }) => data))
  },

  async getById(id: number) {
    const { data } = await apiClient.get<CategoriaResponse>(`/api/categorias/${id}`)
    return data
  },

  async create(payload: CategoriaRequest) {
    const { data } = await apiClient.post<CategoriaResponse>('/api/categorias', payload)
    invalidateCategoriesCache()
    return data
  },

  async update(id: number, payload: CategoriaRequest) {
    const { data } = await apiClient.put<CategoriaResponse>(`/api/categorias/${id}`, payload)
    invalidateCategoriesCache()
    return data
  },

  async remove(id: number) {
    await apiClient.delete(`/api/categorias/${id}`)
    invalidateCategoriesCache()
  },

  async removeBatch(ids: number[]) {
    await apiClient.post('/api/categorias/delete-batch', { ids })
    invalidateCategoriesCache()
  },
}

export const placesApi = {
  async getAll() {
    const { data } = await apiClient.get<LugarResponse[]>('/api/lugares')
    return data
  },

  async getById(id: number) {
    const { data } = await apiClient.get<LugarResponse>(`/api/lugares/${id}`)
    return data
  },

  async create(payload: LugarRequest) {
    const { data } = await apiClient.post<LugarResponse>('/api/lugares', payload)
    return data
  },

  async update(id: number, payload: LugarRequest) {
    const { data } = await apiClient.put<LugarResponse>(`/api/lugares/${id}`, payload)
    return data
  },

  async remove(id: number) {
    await apiClient.delete(`/api/lugares/${id}`)
  },

  async removeBatch(ids: number[]) {
    await apiClient.post('/api/lugares/delete-batch', { ids })
  },
}

export const canchasApi = {
  async getAll(lugarId?: number) {
    const params = lugarId ? `?lugarId=${lugarId}` : ''
    const { data } = await apiClient.get<CanchaResponse[]>(`/api/canchas${params}`)
    return data
  },

  async getById(id: number) {
    const { data } = await apiClient.get<CanchaResponse>(`/api/canchas/${id}`)
    return data
  },

  async create(payload: { nombre: string; descripcion?: string; lugarId: number }) {
    const { data } = await apiClient.post<CanchaResponse>('/api/canchas', payload)
    return data
  },

  async update(id: number, payload: { nombre: string; descripcion?: string; lugarId: number }) {
    const { data } = await apiClient.put<CanchaResponse>(`/api/canchas/${id}`, payload)
    return data
  },

  async remove(id: number) {
    await apiClient.delete(`/api/canchas/${id}`)
  },
}

export const seasonsApi = {
  async getAll() {
    const { data } = await apiClient.get<TemporadaResponse[]>('/api/temporadas')
    return data
  },

  async getById(id: number) {
    const { data } = await apiClient.get<TemporadaResponse>(`/api/temporadas/${id}`)
    return data
  },

  async create(payload: TemporadaRequest) {
    const { data } = await apiClient.post<TemporadaResponse>('/api/temporadas', payload)
    return data
  },

  async update(id: number, payload: TemporadaRequest) {
    const { data } = await apiClient.put<TemporadaResponse>(`/api/temporadas/${id}`, payload)
    return data
  },

  async remove(id: number) {
    await apiClient.delete(`/api/temporadas/${id}`)
  },

  async removeBatch(ids: number[]) {
    await apiClient.post('/api/temporadas/delete-batch', { ids })
  },
}
