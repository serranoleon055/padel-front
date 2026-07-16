import { apiClient } from '@/shared/api/apiClient'
import type { IntegranteInscripcion } from '@/features/inscripciones/inscripcionesApi'

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
  horarios: string[]
  clienteNombre: string
  clienteTelefono: string
}

export interface PagoInscripcionRequest {
  torneoId: number
  inscripcion: {
    categoriaId: number
    telefonoContacto?: string
    jugador1: IntegranteInscripcion
    jugador2: IntegranteInscripcion
  }
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
