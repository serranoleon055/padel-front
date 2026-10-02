import { apiClient } from '@/shared/api/apiClient'

export interface OpcionDuracion {
  minutos: number
  horaFin: string
  precio: number | null
}

export interface SlotDisponibilidad {
  horaInicio: string
  horaFin: string
  disponible: boolean
  opciones: OpcionDuracion[]
}

/** Una cancha con lugar a cierta hora. */
export interface CanchaLibre {
  canchaId: number
  canchaNombre: string
  tipo: string | null
  /** Porcentaje del turno que se cobra como seña. Ya resuelto por el backend. */
  seniaPorcentaje: number
  opciones: OpcionDuracion[]
}

/** La agenda del día vista por horario, no por cancha. */
export interface FranjaSede {
  horaInicio: string
  canchasDisponibles: number
  precioDesde: number | null
  enPromocion: boolean
  canchas: CanchaLibre[]
}

/** El turno como lo ve el jugador desde su enlace. Menos datos que el del panel. */
export interface TurnoPublico {
  codigo: string
  clienteNombre: string
  canchaNombre: string | null
  lugarNombre: string | null
  fecha: string
  horaInicio: string
  horaFin: string
  estado: string
  precio: number | null
  seniaPagada: number | null
  saldoPendiente: number | null
  puedeCancelar: boolean
  motivoNoCancelable: string | null
  horasMinimasCancelacion: number
}

export interface SolicitudReservaRequest {
  canchaId: number
  fecha: string
  horaInicio: string
  /** Minutos del turno. Sin esto, el club usa su duración más corta. */
  duracionMin?: number
  clienteNombre: string
  clienteTelefono: string
  /** Opcional: a donde le llega el comprobante con el enlace de su turno. */
  clienteEmail?: string
}

export interface ReservaResponse {
  id: number
  canchaId: number
  canchaNombre: string
  fecha: string
  horaInicio: string
  horaFin: string
  duracionMin: number
  estado: string
  clienteNombre: string
  clienteTelefono: string
  codigo: string
  /** Token del enlace del turno para el jugador. */
  tokenPublico?: string | null
  estadoPago?: string | null
  montoSenia?: number | null
  montoTotal?: number | null
  precioAplicado?: number | null
  /** true si la generó un turno fijo (abono). */
  turnoFijo?: boolean
  clienteId?: number | null
  seniaPagada?: number | null
  totalCobrado?: number | null
  saldoPendiente?: number | null
  /** Consumo del kiosco anotado en el turno y todavía impago. */
  consumoACuenta?: number | null
  /** Cancha + consumo: lo que vale el turno entero. */
  totalTurno?: number | null
  /**
   * Momento real de arranque, con la jornada resuelta. Solo lo mandan los listados que lo
   * necesitan: pegar `fecha` con `horaInicio` da mal en los turnos de la madrugada.
   */
  inicioReal?: string | null
}

export interface HorarioCanchaRequest {
  canchaId: number
  horaApertura: string
  horaCierre: string
  diasActivos?: string
  /** Duraciones que vende el club, ej. "60,90,120". */
  duracionesOfrecidas?: string
  anticipacionDias?: number
}

export interface HorarioCanchaResponse {
  id: number
  canchaId: number
  horaApertura: string
  horaCierre: string
  diasActivos: string | null
  duracionesOfrecidas: string
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

  async disponibilidadSede(lugarId: number, fecha: string) {
    const { data } = await apiClient.get<{ franjas: FranjaSede[] }>('/api/reservas/disponibilidad-sede', {
      params: { lugarId, fecha },
    })
    return data.franjas
  },

  /**
   * Turnos vivos del día en todas las canchas: lo que mira el mostrador. Sin fecha
   * devuelve la jornada que el club está atendiendo, que a la 1 AM es la de ayer.
   */
  async delDia(fecha?: string) {
    const { data } = await apiClient.get<ReservaResponse[]>('/api/reservas/del-dia', {
      params: fecha ? { fecha } : undefined,
    })
    return data
  },

  /**
   * El turno del jugador, abierto con el token de su enlace. No hay cuenta ni contraseña:
   * el token autoriza ese turno y nada más, como el localizador de un pasaje.
   */
  async miTurno(token: string) {
    const { data } = await apiClient.get<TurnoPublico>(`/api/reservas/mio/${token}`)
    return data
  },

  async cancelarMiTurno(token: string) {
    const { data } = await apiClient.patch<TurnoPublico>(`/api/reservas/mio/${token}/cancelar`)
    return data
  },

  /**
   * La jornada que el club está atendiendo. La resuelve el backend, que es el que sabe a
   * qué hora abre y cierra cada cancha; el front no repite esa cuenta.
   */
  async jornadaActual() {
    const { data } = await apiClient.get<{ fecha: string }>('/api/reservas/jornada-actual')
    return data.fecha
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

  async marcarNoShow(id: number) {
    const { data } = await apiClient.patch<ReservaResponse>(`/api/reservas/${id}/no-show`)
    return data
  },
  async desmarcarNoShow(id: number) {
    const { data } = await apiClient.patch<ReservaResponse>(`/api/reservas/${id}/vino`)
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

  async guardarSucursal(lugarId: number, payload: HorarioCanchaRequest) {
    const { data } = await apiClient.post<HorarioCanchaResponse[]>('/api/horarios-cancha/sucursal', payload, {
      params: { lugarId },
    })
    return data
  },

  async listar(canchaId: number) {
    const { data } = await apiClient.get<HorarioCanchaResponse[]>('/api/horarios-cancha', {
      params: { canchaId },
    })
    return data
  },
}
