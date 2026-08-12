import type { ReservaResponse } from '@/features/reservas/reservasApi'
import { apiClient } from '@/shared/api/apiClient'

export interface ClienteResponse {
  id: number
  nombre: string
  telefono: string
  email: string | null
  notas: string | null
  esJugador: boolean
  turnosTotales: number
  turnosJugados: number
  turnosCaidos: number
  turnosNoShow: number
  gastoAcumulado: number
  ultimoTurno: string | null
}

export interface ClienteFicha {
  cliente: ClienteResponse
  historial: ReservaResponse[]
  /** Otros nombres con los que reservó este mismo teléfono. */
  otrosNombres: string[]
  /** Cancha más consumo que este cliente debe hoy. */
  deuda: number
  /** Lo que dejó en el kiosco en el último año. */
  consumoKiosco: number
  ultimasCompras: {
    id: number
    fecha: string
    total: number
    medio: string | null
    detalle: string
  }[]
  abonos: {
    id: number
    canchaNombre: string
    diaSemana: number
    horaInicio: string
    horaFin: string
    activo: boolean
    vigenteHasta: string | null
  }[]
}

export interface ClienteRequest {
  nombre: string
  telefono: string
  email: string | null
  notas: string | null
}

/** Página de Spring Data: solo lo que usamos. */
export interface PaginaClientes {
  content: ClienteResponse[]
  totalElements: number
  number: number
}

export const clientesApi = {
  async listar(busqueda: string, pagina: number, tamano: number) {
    const { data } = await apiClient.get<PaginaClientes>('/api/clientes', {
      params: { busqueda: busqueda || undefined, pagina, tamano },
    })
    return data
  },
  async ficha(id: number) {
    const { data } = await apiClient.get<ClienteFicha>(`/api/clientes/${id}`)
    return data
  },
  async actualizar(id: number, body: ClienteRequest) {
    const { data } = await apiClient.put<ClienteResponse>(`/api/clientes/${id}`, body)
    return data
  },
}
