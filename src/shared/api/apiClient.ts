import axios from 'axios'

function normalizeApiBaseUrl(raw?: string): string {
  const value = (raw ?? '').trim()
  if (!value) return ''
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`
  return withScheme.replace(/\/+$/, '')
}

/**
 * En desarrollo, un backend en `localhost` se reemplaza por rutas relativas y el proxy de
 * Vite (`vite.config.ts`) es el que llega hasta él.
 *
 * Es lo que permite abrir la demo desde el celular por la IP de la red
 * (`npm run dev -- --host`): el teléfono pide todo al mismo origen que le sirvió la
 * página, así que no hay que escribir la IP en el `.env` ni sumarla al CORS del backend.
 * Con `localhost` escrito acá, el navegador del teléfono buscaría el backend dentro del
 * propio teléfono y todas las pantallas quedarían vacías.
 *
 * Un backend remoto puesto en desarrollo (Render, por ejemplo) se respeta tal cual, y el
 * build de producción no se toca.
 */
function baseDeDesarrollo(url: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(url) ? '' : url
}

const URL_CONFIGURADA = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL)
const API_BASE_URL = import.meta.env.DEV ? baseDeDesarrollo(URL_CONFIGURADA) : URL_CONFIGURADA

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

export function resolveSedeAsset(url?: string | null) {
  if (!url) return null
  return url.startsWith('/uploads') ? resolveApiAssetUrl(url) : url
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  // Sin tope, una request que no vuelve deja la pantalla cargando para siempre: pasa con
  // una barra de señal en la cancha, y el que atiende no tiene ni un error para reintentar.
  // 20 segundos es más de lo que tarda la pantalla más pesada y menos de lo que nadie
  // espera mirando un spinner.
  timeout: 20000,
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
      if (typeof window !== 'undefined'
        && window.location.pathname.startsWith('/admin')) {
        window.location.assign('/login')
      }
    }

    return Promise.reject(error)
  },
)
