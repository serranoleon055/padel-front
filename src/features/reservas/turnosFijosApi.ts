import { apiClient } from '@/shared/api/apiClient'

export interface TurnoFijoRequest {
  canchaId: number
  diaSemana: number
  horaInicio: string
  duracionMin: number
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
  duracionMin: number
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

/** Una franja libre para vender como abono. Las horas vienen del backend como HH:mm:ss. */
export interface FranjaAbonoLibre {
  horaDesde: string
  horaHasta: string
}

/** `cerrada` es "el club no atiende ese día", distinto de "atiende y está todo vendido". */
export interface CanchaDelDiaAbonos {
  canchaId: number
  canchaNombre: string
  cerrada: boolean
  franjas: FranjaAbonoLibre[]
}

export interface DiaAbonos {
  diaSemana: number
  nombre: string
  canchas: CanchaDelDiaAbonos[]
}

export interface DisponibilidadAbonos {
  dias: DiaAbonos[]
  canchas: { id: number; nombre: string }[]
}

export const turnosFijosApi = {
  /** Qué franjas le quedan al club por vender como abono, por día y por cancha. */
  async disponibilidadSemanal(lugarId?: number | null) {
    const { data } = await apiClient.get<DisponibilidadAbonos>('/api/turnos-fijos/disponibilidad-semanal', {
      params: { lugarId: lugarId ?? undefined },
    })
    return data
  },
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
  /** Reactiva un abono dado de baja. Después hay que llamar a generar(). */
  async reactivar(id: number) {
    const { data } = await apiClient.patch<TurnoFijoResponse>(`/api/turnos-fijos/${id}/reactivar`)
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
