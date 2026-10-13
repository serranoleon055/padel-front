import { esColumnaSuperTiebreak, FORMATOS_PARTIDO } from '@/shared/lib/formatoPartido'
import type { FormatoPartido, PartidoResponse } from '@/shared/types/api'

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

/** Valida set por set mientras se carga, sin exigir todavía que el partido esté definido. */
export function validarFormatoSets(marcador: string, formato: FormatoPartido = 'TRES_SETS'): string | null {
  const texto = (marcador ?? '').trim()
  if (!texto) return null

  const reglas = FORMATOS_PARTIDO[formato]

  if (!/^\d+-\d+(\s*\/\s*\d+-\d+)*$/.test(texto)) {
    return reglas.maximoSets === 1
      ? `Formato inválido. Cargá un set, por ejemplo ${reglas.gamesPorSet === 9 ? '9-5' : '6-3'}.`
      : 'Formato inválido. Separá los sets con / (ej: 6-3 / 4-6 / 7-5).'
  }

  const sets = texto.split(/\s*\/\s*/)
  for (let i = 0; i < sets.length; i++) {
    const [localStr, visitanteStr] = sets[i].split('-')
    const local = Number(localStr)
    const visitante = Number(visitanteStr)
    if (local === visitante) return 'Un set no puede terminar empatado.'

    const errorSet = validarSet(local, visitante, i, formato)
    if (errorSet) return errorSet
  }

  return null
}

export function validarMarcador(marcador: string, formato: FormatoPartido = 'TRES_SETS'): string | null {
  const texto = (marcador ?? '').trim()
  if (!texto) return 'El marcador es obligatorio.'

  const { maximoSets } = FORMATOS_PARTIDO[formato]
  const setsParaGanar = Math.floor(maximoSets / 2) + 1

  const errorFormato = validarFormatoSets(texto, formato)
  if (errorFormato) return errorFormato

  const sets = texto.split(/\s*\/\s*/)
  if (sets.length < setsParaGanar || sets.length > maximoSets) {
    return maximoSets === 1
      ? 'Este partido es a un set: cargá un único resultado.'
      : `Un partido se define al mejor de ${maximoSets} sets: cargá entre ${setsParaGanar} y ${maximoSets} sets.`
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

function validarSet(local: number, visitante: number, indice: number, formato: FormatoPartido): string | null {
  const ganador = Math.max(local, visitante)
  const perdedor = Math.min(local, visitante)
  const diferencia = ganador - perdedor
  const numSet = indice + 1

  if (esColumnaSuperTiebreak(formato, indice)) {
    const valido = ganador === 10 ? perdedor <= 8 : ganador > 10 && diferencia === 2
    return valido ? null : `El super tie-break ${local}-${visitante} no es válido: se gana a 10 con 2 de diferencia (10-8, 11-9...).`
  }

  if (FORMATOS_PARTIDO[formato].gamesPorSet === 9) {
    return ganador === 9 ? null : `El set a 9 games ${local}-${visitante} no es válido: se gana con 9 (9-8 si hubo tie-break).`
  }

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
