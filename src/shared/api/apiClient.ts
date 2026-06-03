import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export const AUTH_TOKEN_KEY = 'rankpadel_token'

export function resolveApiAssetUrl(url?: string | null) {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  if (!API_BASE_URL) return url
  try {
    const base = new URL(API_BASE_URL)
    return `${base.origin}/${url.replace(/^\//, '')}`
  } catch {
    return `${API_BASE_URL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      // Sesión expirada/no autenticado: llevar al login si estamos en una
      // ruta protegida del admin, evitando bucles si ya estamos en el login.
      if (typeof window !== 'undefined'
        && window.location.pathname.startsWith('/admin')) {
        window.location.assign('/login')
      }
    }

    return Promise.reject(error)
  },
)
