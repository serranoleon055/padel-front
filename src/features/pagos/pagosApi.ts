import { apiClient } from '@/shared/api/apiClient'
import type { SolicitudInscripcionRequest } from '@/features/inscripciones/inscripcionesApi'

export interface PagoCreadoResponse {
  pagoId: number
  referencia: string
  initPoint: string
}

export interface PagoResponse {
  id: number
  concepto: string
  estado: string
  montoTotal: number
  montoSenia: number
}

export interface PagoReservaRequest {
  canchaId: number
  fecha: string
  horaInicio: string
  /** Minutos del turno. Sin esto, el club usa su duración más corta. */
  duracionMin?: number
  clienteNombre: string
  clienteTelefono: string
}

export interface PagoInscripcionRequest {
  torneoId: number
  inscripcion: SolicitudInscripcionRequest
}

export const pagosApi = {
  async crearPagoReserva(payload: PagoReservaRequest) {
    const { data } = await apiClient.post<PagoCreadoResponse>('/api/pagos/reserva', payload)
    return data
  },

  async crearPagoInscripcion(payload: PagoInscripcionRequest) {
    const { data } = await apiClient.post<PagoCreadoResponse>('/api/pagos/inscripcion', payload)
    return data
  },

  async obtenerPago(referencia: string) {
    const { data } = await apiClient.get<PagoResponse>(`/api/pagos/${referencia}`)
    return data
  },

  async cancelarPagoReserva(referencia: string) {
    const { data } = await apiClient.post<PagoResponse>(`/api/pagos/${referencia}/cancelar`)
    return data
  },
}
