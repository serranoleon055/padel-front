import type { PartidoResponse } from '@/shared/types/api'

export type SetMarcador = {
  local: string
  visitante: string
  winner: 'local' | 'visitante' | null
}

export function parsearMarcador(marcador: string | null | undefined): SetMarcador[] {
  if (!marcador) return []

  return marcador
    .split(/\s*\/\s*|\s+/)
    .map((set) => set.match(/^(\d+)-(\d+)/))
    .filter((coincidencia): coincidencia is RegExpMatchArray => Boolean(coincidencia))
    .map((coincidencia) => {
      const local = Number(coincidencia[1])
      const visitante = Number(coincidencia[2])

      return {
        local: coincidencia[1],
        visitante: coincidencia[2],
        winner:
          local === visitante
            ? null
            : local > visitante
              ? 'local'
              : 'visitante',
      }
    })
}

export function obtenerLadoGanador(partido: PartidoResponse): 'local' | 'visitante' {
  if (partido.ganadorId && partido.ganadorId === partido.parejaVisitanteId) {
    return 'visitante'
  }

  return 'local'
}

export function obtenerTotalesSets(sets: SetMarcador[]) {
  return sets.reduce(
    (totales, set) => {
      if (set.winner === 'local') totales.local += 1
      if (set.winner === 'visitante') totales.visitante += 1
      return totales
    },
    { local: 0, visitante: 0 }
  )
}
