import { apiClient } from '@/shared/api/apiClient'

export interface SponsorRequest {
  nombre: string
  logoUrl: string
  enlace: string | null
  /** Null = se muestra en todas las sedes. */
  lugarId: number | null
  orden: number
  activo?: boolean
}

export interface SponsorResponse {
  id: number
  nombre: string
  logoUrl: string
  enlace: string | null
  lugarId: number | null
  lugarNombre: string | null
  orden: number
  activo: boolean
}

export const sponsorsApi = {
  /** Público: solo los activos. */
  async visibles(lugarId?: number | null) {
    const { data } = await apiClient.get<SponsorResponse[]>('/api/sponsors', {
      params: { lugarId: lugarId ?? undefined },
    })
    return data
  },
  /** Panel: incluye los dados de baja, para poder reactivarlos. */
  async todos() {
    const { data } = await apiClient.get<SponsorResponse[]>('/api/sponsors/todos')
    return data
  },
  async create(body: SponsorRequest) {
    const { data } = await apiClient.post<SponsorResponse>('/api/sponsors', body)
    return data
  },
  async update(id: number, body: SponsorRequest) {
    const { data } = await apiClient.put<SponsorResponse>(`/api/sponsors/${id}`, body)
    return data
  },
  async remove(id: number) {
    await apiClient.delete(`/api/sponsors/${id}`)
  },
}
