import { apiClient } from '@/shared/api/apiClient'

export interface JugadorBusqueda {
  id: number
  nombre: string
  apellido: string
  categoriaNombre: string | null
  genero: 'MASCULINO' | 'FEMENINO' | null
}

export interface IntegranteInscripcion {
  jugadorId?: number | null
  nombre?: string
  apellido?: string
  genero?: string
  telefono?: string
  fechaNacimiento?: string
  posicionJuego?: string
}

export interface SolicitudInscripcionRequest {
  categoriaId: number
  telefonoContacto?: string
  jugador1: IntegranteInscripcion
  jugador2: IntegranteInscripcion
}

export interface JugadorCandidato {
  id: number
  nombre: string
  apellido: string
  categoriaNombre: string | null
}

export interface SolicitudInscripcionResponse {
  id: number
  torneoId: number
  categoriaId: number
  categoriaNombre: string
  estado: string
  telefonoContacto: string | null
  jugador1: string
  jugador2: string
  jugador1EsNuevo: boolean
  jugador2EsNuevo: boolean
  jugador1Candidatos: JugadorCandidato[]
  jugador2Candidatos: JugadorCandidato[]
  pagada: boolean
  estadoPago: string | null
  montoSenia: number | null
}

export interface AprobarInscripcionRequest {
  jugador1Id?: number | null
  jugador2Id?: number | null
}

export const inscripcionesApi = {
  async buscarJugadores(q: string) {
    const { data } = await apiClient.get<JugadorBusqueda[]>('/api/jugadores/buscar', { params: { q } })
    return data
  },

  async crear(torneoId: number, payload: SolicitudInscripcionRequest) {
    const { data } = await apiClient.post<SolicitudInscripcionResponse>(`/api/torneos/${torneoId}/inscripciones`, payload)
    return data
  },

  async listar(torneoId: number, estado?: string) {
    const { data } = await apiClient.get<SolicitudInscripcionResponse[]>('/api/inscripciones', {
      params: { torneoId, estado },
    })
    return data
  },

  async aprobar(id: number, seleccion?: AprobarInscripcionRequest) {
    const { data } = await apiClient.patch<SolicitudInscripcionResponse>(`/api/inscripciones/${id}/aprobar`, seleccion)
    return data
  },

  async rechazar(id: number) {
    const { data } = await apiClient.patch<SolicitudInscripcionResponse>(`/api/inscripciones/${id}/rechazar`)
    return data
  },
}
