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

export function validarFormatoSets(marcador: string, mejorDeSets = 3): string | null {
  const texto = (marcador ?? '').trim()
  if (!texto) return null

  const mejorDe = mejorDeSets && mejorDeSets > 0 ? mejorDeSets : 3

  if (!/^\d+-\d+(\s*\/\s*\d+-\d+)*$/.test(texto)) {
    return mejorDe === 1
      ? 'Formato inválido. Cargá un set, por ejemplo 6-3.'
      : 'Formato inválido. Separá los sets con / (ej: 6-3 / 4-6 / 7-5).'
  }

  const sets = texto.split(/\s*\/\s*/)
  for (let i = 0; i < sets.length; i++) {
    const [localStr, visitanteStr] = sets[i].split('-')
    const local = Number(localStr)
    const visitante = Number(visitanteStr)
    if (local === visitante) return 'Un set no puede terminar empatado.'

    const errorSet = validarSet(local, visitante, i + 1)
    if (errorSet) return errorSet
  }

  return null
}

export function validarMarcador(marcador: string, mejorDeSets = 3): string | null {
  const texto = (marcador ?? '').trim()
  if (!texto) return 'El marcador es obligatorio.'

  const mejorDe = mejorDeSets && mejorDeSets > 0 ? mejorDeSets : 3
  const setsParaGanar = Math.floor(mejorDe / 2) + 1

  const errorFormato = validarFormatoSets(texto, mejorDe)
  if (errorFormato) return errorFormato

  const sets = texto.split(/\s*\/\s*/)
  if (sets.length < setsParaGanar || sets.length > mejorDe) {
    return mejorDe === 1
      ? 'Este torneo es a 1 set: cargá un único set (por ejemplo 6-3).'
      : `Un partido se define al mejor de ${mejorDe} sets: cargá entre ${setsParaGanar} y ${mejorDe} sets.`
  }

  let setsLocal = 0
  let setsVisitante = 0

  for (let i = 0; i < sets.length; i++) {
    const [localStr, visitanteStr] = sets[i].split('-')
    const local = Number(localStr)
    const visitante = Number(visitanteStr)
    if (local > visitante) setsLocal++
    else setsVisitante++

    if ((setsLocal === setsParaGanar || setsVisitante === setsParaGanar) && i < sets.length - 1) {
      return 'El partido ya quedó definido; no puede tener más sets.'
    }
  }

  if (setsLocal !== setsParaGanar && setsVisitante !== setsParaGanar) {
    return `El partido no está definido: el ganador debe ganar ${setsParaGanar} ${setsParaGanar === 1 ? 'set' : 'sets'}.`
  }

  return null
}

function validarSet(local: number, visitante: number, numSet: number): string | null {
  const ganador = Math.max(local, visitante)
  const perdedor = Math.min(local, visitante)
  const diferencia = ganador - perdedor

  if (ganador < 6) return `El set ${numSet} no tiene un marcador válido (mínimo 6 juegos): ${local}-${visitante}.`
  if (ganador === 6 && diferencia < 2) return `El set ${numSet} con ${local}-${visitante} no es válido: se necesita ventaja de 2 o llegar a 7.`
  if (ganador === 7 && perdedor < 5) return `El set ${numSet} con ${local}-${visitante} no es un marcador válido de pádel.`
  if (ganador > 7) return `Un set no puede superar 7 juegos: ${local}-${visitante}.`
  return null
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
