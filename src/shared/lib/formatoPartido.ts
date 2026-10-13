import type { ConfiguracionCategoriaTorneoResponse, FormatoPartido, PartidoResponse } from '@/shared/types/api'

type ReglasFormato = {
  label: string
  maximoSets: number
  gamesPorSet: number
  /** El último set se define con un super tie-break a 10 puntos. */
  superTiebreak: boolean
  ayuda: string
}

/** Espejo de FormatoPartido del backend: el backend vuelve a validar todo. */
export const FORMATOS_PARTIDO: Record<FormatoPartido, ReglasFormato> = {
  TRES_SETS: {
    label: 'Mejor de 3 sets',
    maximoSets: 3,
    gamesPorSet: 6,
    superTiebreak: false,
    ayuda: 'Cargá los games de cada set (6 con +2, 7-5 o 7-6).',
  },
  DOS_SETS_SUPER_TIEBREAK: {
    label: '2 sets + super tie-break',
    maximoSets: 3,
    gamesPorSet: 6,
    superTiebreak: true,
    ayuda: 'Sets a 6 games (7-5 o 7-6). Si quedan 1-1, el super tie-break se gana a 10 con 2 de diferencia.',
  },
  UN_SET: {
    label: '1 set a 6 games',
    maximoSets: 1,
    gamesPorSet: 6,
    superTiebreak: false,
    ayuda: 'Un único set: 6 con +2, 7-5 o 7-6.',
  },
  PRO_SET_9: {
    label: '1 set a 9 games',
    maximoSets: 1,
    gamesPorSet: 9,
    superTiebreak: false,
    ayuda: 'Pro set: gana el primero a 9 (9-8 si hubo tie-break en 8-8).',
  },
}

export const OPCIONES_FORMATO_PARTIDO = (Object.keys(FORMATOS_PARTIDO) as FormatoPartido[])
  .map((valor) => ({ valor, label: FORMATOS_PARTIDO[valor].label }))

export function formatoDesdeMejorDeSets(mejorDeSets: number | null | undefined): FormatoPartido {
  return mejorDeSets === 1 ? 'UN_SET' : 'TRES_SETS'
}

/** El formato que manda el backend para el partido; si es un backend viejo, el del torneo. */
export function formatoDelPartido(partido: Pick<PartidoResponse, 'formatoPartido'>, porDefecto: FormatoPartido): FormatoPartido {
  return partido.formatoPartido ?? porDefecto
}

export function esColumnaSuperTiebreak(formato: FormatoPartido, indiceSet: number): boolean {
  const reglas = FORMATOS_PARTIDO[formato]
  return reglas.superTiebreak && indiceSet === reglas.maximoSets - 1
}

/** "Zona: 1 set a 6 games · Llave: Mejor de 3 sets · Finales: 1 set a 9 games", sin repetir lo heredado. */
export function resumenFormatos(config: Pick<ConfiguracionCategoriaTorneoResponse,
  'mejorDeSets' | 'incluyeFaseGrupos' | 'incluyeEliminacion' | 'formatoPartidoGrupos' | 'formatoPartidoEliminacion' | 'formatoPartidoFinales'>): string {
  const general = formatoDesdeMejorDeSets(config.mejorDeSets)
  const llave = config.formatoPartidoEliminacion ?? general
  const fases: [string, FormatoPartido][] = []
  if (config.incluyeFaseGrupos || !config.incluyeEliminacion) fases.push(['Zona', config.formatoPartidoGrupos ?? general])
  if (config.incluyeEliminacion) {
    fases.push(['Llave', llave])
    fases.push(['Finales', config.formatoPartidoFinales ?? llave])
  }
  if (new Set(fases.map(([, formato]) => formato)).size === 1) return FORMATOS_PARTIDO[fases[0][1]].label
  return fases.map(([fase, formato]) => `${fase}: ${FORMATOS_PARTIDO[formato].label}`).join(' · ')
}
