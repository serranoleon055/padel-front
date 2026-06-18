import type { EstadoTorneo } from '@/shared/types/api'

export const ESTADO_SIGUIENTE: Partial<Record<EstadoTorneo, EstadoTorneo>> = {
    BORRADOR: 'INSCRIPCION',
    SORTEADO: 'EN_CURSO',
    EN_CURSO: 'FINALIZADO',
}

export const ETIQUETA_SIGUIENTE: Partial<Record<EstadoTorneo, string>> = {
    BORRADOR: 'Abrir inscripciones',
    SORTEADO: 'Iniciar torneo',
    EN_CURSO: 'Finalizar torneo',
}

export function tono(estado: EstadoTorneo): 'neutral' | 'warning' | 'live' | 'success' {
    if (estado === 'EN_CURSO') return 'live'
    if (estado === 'FINALIZADO') return 'success'
    if (estado === 'INSCRIPCION' || estado === 'SORTEADO') return 'warning'
    return 'neutral'
}

export const PUEDE_RETROCEDER: Partial<Record<EstadoTorneo, EstadoTorneo>> = {
    INSCRIPCION: 'BORRADOR',
}

export const ETIQUETA_RETROCESO: Partial<Record<EstadoTorneo, string>> = {
    INSCRIPCION: 'Cancelar inscripciones',
}

export function puedeSortear(estado: EstadoTorneo, cantidadParejas: number, _cantidadPartidos: number): boolean {
    return estado === 'INSCRIPCION' && cantidadParejas > 0
}

export function puedeCargarResultados(estado: EstadoTorneo, jugables: number): boolean {
    return estado === 'EN_CURSO' && jugables > 0
}

const CANCELABLES: EstadoTorneo[] = ['BORRADOR', 'CANCELADO', 'FINALIZADO']

export function puedeEliminar(estado: EstadoTorneo): boolean {
    return CANCELABLES.includes(estado)
}
