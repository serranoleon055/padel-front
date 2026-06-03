import { apiClient } from '@/shared/api/apiClient'
import type { AdminUserRequest, AdminUserResponse } from '@/shared/types/api'

export const adminUsersApi = {
  async getAll() {
    const { data } = await apiClient.get<AdminUserResponse[]>('/api/admins')
    return data
  },

  async create(payload: AdminUserRequest) {
    const { data } = await apiClient.post<AdminUserResponse>('/api/admins', payload)
    return data
  },

  async update(id: number, payload: AdminUserRequest) {
    const { data } = await apiClient.put<AdminUserResponse>(`/api/admins/${id}`, payload)
    return data
  },

  async remove(id: number) {
    await apiClient.delete(`/api/admins/${id}`)
  },
}
