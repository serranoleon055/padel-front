import { apiClient } from '@/shared/api/apiClient'

export interface SlotDisponibilidad {
  horaInicio: string
  horaFin: string
  disponible: boolean
}

export interface SolicitudReservaRequest {
  canchaId: number
  fecha: string
  horaInicio: string
  clienteNombre: string
  clienteTelefono: string
}

export interface SolicitudLoteReservaRequest {
  canchaId: number
  fecha: string
  horarios: string[]
  clienteNombre: string
  clienteTelefono: string
}

export interface ReservaResponse {
  id: number
  canchaId: number
  canchaNombre: string
  fecha: string
  horaInicio: string
  horaFin: string
  estado: string
  clienteNombre: string
  clienteTelefono: string
  codigo: string
}

export interface HorarioCanchaRequest {
  canchaId: number
  horaApertura: string
  horaCierre: string
  diasActivos?: string
  duracionSlotMin?: number
  anticipacionDias?: number
}

export interface HorarioCanchaResponse {
  id: number
  canchaId: number
  horaApertura: string
  horaCierre: string
  diasActivos: string | null
  duracionSlotMin: number
  anticipacionDias: number
  activo: boolean
}

export const reservasApi = {
  async getDisponibilidad(canchaId: number, fecha: string) {
    const { data } = await apiClient.get<SlotDisponibilidad[]>('/api/reservas/disponibilidad', {
      params: { canchaId, fecha },
    })
    return data
  },

  async solicitar(payload: SolicitudReservaRequest) {
    const { data } = await apiClient.post<ReservaResponse>('/api/reservas', payload)
    return data
  },

  async solicitarLote(payload: SolicitudLoteReservaRequest) {
    const { data } = await apiClient.post<ReservaResponse[]>('/api/reservas/lote', payload)
    return data
  },

  async listar(canchaId: number, fecha: string) {
    const { data } = await apiClient.get<ReservaResponse[]>('/api/reservas', {
      params: { canchaId, fecha },
    })
    return data
  },

  async confirmar(id: number) {
    const { data } = await apiClient.patch<ReservaResponse>(`/api/reservas/${id}/confirmar`)
    return data
  },

  async rechazar(id: number) {
    const { data } = await apiClient.patch<ReservaResponse>(`/api/reservas/${id}/rechazar`)
    return data
  },

  async cancelar(id: number) {
    const { data } = await apiClient.patch<ReservaResponse>(`/api/reservas/${id}/cancelar`)
    return data
  },
}

export const horariosCanchaApi = {
  async guardar(payload: HorarioCanchaRequest) {
    const { data } = await apiClient.post<HorarioCanchaResponse>('/api/horarios-cancha', payload)
    return data
  },

  async listar(canchaId: number) {
    const { data } = await apiClient.get<HorarioCanchaResponse[]>('/api/horarios-cancha', {
      params: { canchaId },
    })
    return data
  },
}
