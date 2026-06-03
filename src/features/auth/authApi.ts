import { AUTH_TOKEN_KEY, apiClient } from '@/shared/api/apiClient'

import type { LoginRequest, LoginResponse } from '@/shared/types/api'

export const authApi = {
  async login(payload: LoginRequest) {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', payload)
    localStorage.setItem(AUTH_TOKEN_KEY, data.token)
    return data
  },

  logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY)
  },

  getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY)
  },

  isAuthenticated() {
    return Boolean(localStorage.getItem(AUTH_TOKEN_KEY))
  },

  async verifyToken() {
    await apiClient.get('/auth/verify')
  },
}
