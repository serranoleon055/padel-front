import axios from 'axios'

import type { ApiError } from '@/shared/types/api'

const SIN_CONEXION = 'No pudimos conectarnos con el servidor. Revisá tu conexión y volvé a intentar en unos segundos.'

/**
 * Mensaje para mostrarle a la persona cuando algo falla.
 *
 * <p>Antes, si el servidor no respondía, caía en `error.message` de axios y la pantalla
 * mostraba "Network Error" tal cual: en inglés y sin decir qué hacer. Lo veía cualquiera
 * que entrara al sitio justo mientras el backend estaba reiniciando.
 */
export function obtenerMensajeErrorApi(error: unknown) {
  if (axios.isAxiosError<ApiError>(error)) {
    const delServidor = error.response?.data?.mensaje
    if (delServidor) return delServidor

    // Sin respuesta: no llegamos al servidor (caído, reiniciando o sin internet).
    if (!error.response) {
      return error.code === 'ECONNABORTED'
        ? 'El servidor tardó demasiado en responder. Probá de nuevo.'
        : SIN_CONEXION
    }

    // Respondió, pero sin cuerpo que explique el motivo.
    switch (error.response.status) {
      case 401:
        return 'Tu sesión venció. Volvé a iniciar sesión.'
      case 403:
        return 'No tenés permiso para hacer esto.'
      case 404:
        return 'No encontramos lo que buscabas.'
      case 429:
        return 'Hiciste muchos intentos seguidos. Esperá un momento.'
      default:
        return error.response.status >= 500
          ? 'El servidor tuvo un problema. Probá de nuevo en unos minutos.'
          : 'No se pudo completar la operación.'
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'No se pudo completar la operación.'
}
