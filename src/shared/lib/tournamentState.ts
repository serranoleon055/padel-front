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

/**
 * Cómo se vuelve atrás desde cada estado.
 *
 * <p>SORTEADO no está acá: deshacer un sorteo no es cambiar de estado, es borrar el cuadro
 * generado, y va por su propio endpoint ({@code undoDraw}).
 *
 * <p>Reabrir un torneo finalizado lo soportaba el backend desde siempre —reabre el ranking
 * y borra los campeones— pero la pantalla no ofrecía el botón, así que un torneo cerrado
 * por error quedaba cerrado para siempre.
 */
export const PUEDE_RETROCEDER: Partial<Record<EstadoTorneo, EstadoTorneo>> = {
    INSCRIPCION: 'BORRADOR',
    FINALIZADO: 'EN_CURSO',
}

export const ETIQUETA_RETROCESO: Partial<Record<EstadoTorneo, string>> = {
    INSCRIPCION: 'Cancelar inscripciones',
    FINALIZADO: 'Reabrir torneo',
}

/**
 * Lo que hay que advertir antes de retroceder, cuando el paso atrás borra algo. Cancelar
 * inscripciones no destruye nada, así que no lleva aviso.
 */
export const AVISO_RETROCESO: Partial<Record<EstadoTorneo, string>> = {
    FINALIZADO: 'Se va a reabrir el ranking de este torneo y se van a borrar sus campeones. Los resultados cargados no se tocan.',
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
