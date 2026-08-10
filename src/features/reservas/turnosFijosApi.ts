import { apiClient } from '@/shared/api/apiClient'

export interface TurnoFijoRequest {
  canchaId: number
  diaSemana: number
  horaInicio: string
  slots: number
  clienteNombre: string
  clienteTelefono: string
  precioPactado: number | null
  vigenteDesde: string
  vigenteHasta: string | null
  notas: string | null
}

export interface TurnoFijoResponse {
  id: number
  canchaId: number
  canchaNombre: string
  lugarId: number | null
  lugarNombre: string | null
  diaSemana: number
  horaInicio: string
  horaFin: string
  slots: number
  clienteNombre: string
  clienteTelefono: string
  precioPactado: number | null
  vigenteDesde: string
  vigenteHasta: string | null
  activo: boolean
  notas: string | null
  generadoHasta: string | null
}

export interface ConflictoTurnoFijo {
  turnoFijoId: number
  clienteNombre: string
  canchaNombre: string
  fecha: string
  horaInicio: string
  motivo: string
}

export interface GeneracionTurnosFijos {
  generadas: number
  conflictos: ConflictoTurnoFijo[]
}

export const turnosFijosApi = {
  async getAll(params?: { lugarId?: number | null; canchaId?: number | null }) {
    const { data } = await apiClient.get<TurnoFijoResponse[]>('/api/turnos-fijos', {
      params: { lugarId: params?.lugarId ?? undefined, canchaId: params?.canchaId ?? undefined },
    })
    return data
  },
  async create(body: TurnoFijoRequest) {
    const { data } = await apiClient.post<TurnoFijoResponse>('/api/turnos-fijos', body)
    return data
  },
  async update(id: number, body: TurnoFijoRequest) {
    const { data } = await apiClient.put<TurnoFijoResponse>(`/api/turnos-fijos/${id}`, body)
    return data
  },
  async remove(id: number) {
    await apiClient.delete(`/api/turnos-fijos/${id}`)
  },
  async generar(id: number) {
    const { data } = await apiClient.post<GeneracionTurnosFijos>(`/api/turnos-fijos/${id}/generar`)
    return data
  },
  async generarTodos() {
    const { data } = await apiClient.post<GeneracionTurnosFijos>('/api/turnos-fijos/generar')
    return data
  },
}
