import axios from 'axios'

import type { ApiError } from '@/shared/types/api'

export function obtenerMensajeErrorApi(error: unknown) {
  if (axios.isAxiosError<ApiError>(error)) {
    return error.response?.data?.mensaje ?? error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'No se pudo completar la operacion.'
}
