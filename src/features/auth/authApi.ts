import { AUTH_TOKEN_KEY, apiClient } from '@/shared/api/apiClient'

import type { LoginRequest, LoginResponse } from '@/shared/types/api'

export type RolUsuario = 'DUENIO' | 'MOSTRADOR'

const AUTH_ROL_KEY = 'rankpadel_rol'
const AUTH_USUARIO_KEY = 'rankpadel_usuario'

export const authApi = {
  async login(payload: LoginRequest) {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', payload)
    localStorage.setItem(AUTH_TOKEN_KEY, data.token)
    localStorage.setItem(AUTH_ROL_KEY, data.rol ?? 'DUENIO')
    localStorage.setItem(AUTH_USUARIO_KEY, data.usuario ?? '')
    return data
  },

  logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_ROL_KEY)
    localStorage.removeItem(AUTH_USUARIO_KEY)
  },

  /**
   * Sirve para no mostrar menús que van a dar 403. La restricción real la hace el
   * backend: esto es comodidad, no seguridad.
   *
   * <p>Un token viejo no tiene rol guardado; se asume dueño, que es lo que era antes.
   */
  getRol(): RolUsuario {
    return localStorage.getItem(AUTH_ROL_KEY) === 'MOSTRADOR' ? 'MOSTRADOR' : 'DUENIO'
  },

  esDuenio() {
    return this.getRol() === 'DUENIO'
  },

  getUsuario() {
    return localStorage.getItem(AUTH_USUARIO_KEY) || null
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
