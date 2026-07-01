import { formatearEtapaPartido, formatearNombreRonda } from '@/shared/lib/formatters'
import type { PartidoResponse, TorneoDetalleResponse } from '@/shared/types/api'

const TAMANOS_RONDA = [16, 8, 4, 2] as const

const ETIQUETAS_RONDA: Record<number, string> = {
  16: 'Octavos de final',
  8: 'Cuartos de final',
  4: 'Semifinales',
  2: 'Final',
}

export type RondaCuadro = {
  etiqueta: string
  partidos: Array<PartidoResponse | null>
  tamano: number
}

function obtenerTamanoRonda(ronda: string | null | undefined) {
  const formateado = formatearNombreRonda(ronda)
  const normalizado = (formateado ?? ronda ?? '').trim().toLowerCase()
  const tamanoExplicito = normalizado.match(/ronda\s+de\s+(\d+)/)?.[1]

  if (tamanoExplicito) return Number(tamanoExplicito)
  if (normalizado.includes('octavo')) return 16
  if (normalizado.includes('cuarto')) return 8
  if (normalizado.includes('semi')) return 4
  if (normalizado.includes('final')) return 2
  return null
}

function obtenerTamanoInicial(partidos: PartidoResponse[], parejas: TorneoDetalleResponse['parejas'], torneo: TorneoDetalleResponse['torneo']) {
  const mayorTamanoNombrado = Math.max(0, ...partidos.map((partido) => obtenerTamanoRonda(partido.ronda)).filter(Boolean) as number[])
  const mayorRondaReal = Math.max(0, ...Object.values(
    partidos.reduce<Record<string, number>>((acumulador, partido) => {
      const clave = String(partido.rondaOrden ?? obtenerTamanoRonda(partido.ronda) ?? formatearEtapaPartido(partido))
      acumulador[clave] = (acumulador[clave] ?? 0) + 1
      return acumulador
    }, {}),
  ).map((cantidad) => cantidad * 2))
  const clasificadosGrupos =
    torneo.incluyeFaseGrupos && torneo.cantidadGrupos && torneo.avanzanPorGrupo
      ? torneo.cantidadGrupos * torneo.avanzanPorGrupo
      : 0
  const participantesConfig = clasificadosGrupos || parejas.length || torneo.cantidadParejasObjetivo || 0
  const tamanoCuadroExplicito = Math.max(mayorTamanoNombrado, mayorRondaReal)
  const tamanoInferido = tamanoCuadroExplicito || participantesConfig || 2

  return [...TAMANOS_RONDA].reverse().find((tamano) => tamano >= tamanoInferido) ?? 16
}

export function construirRondasCuadro(partidos: PartidoResponse[], parejas: TorneoDetalleResponse['parejas'], torneo: TorneoDetalleResponse['torneo']): RondaCuadro[] {
  const tamanoInicial = obtenerTamanoInicial(partidos, parejas, torneo)
  const tamanosPosibles = TAMANOS_RONDA.filter((tamano) => tamano <= tamanoInicial)
  const clavesRondaOrdenadas = [...new Set(partidos.map((partido) => partido.rondaOrden ?? obtenerTamanoRonda(partido.ronda) ?? 0))]
    .sort((a, b) => Number(a) - Number(b))
  const ordenATamano = new Map(clavesRondaOrdenadas.map((orden, index) => [orden, tamanosPosibles[index] ?? tamanosPosibles.at(-1) ?? 2]))
  const partidosPorTamano = new Map<number, PartidoResponse[]>()

  partidos.forEach((partido) => {
    const tamano = obtenerTamanoRonda(partido.ronda) ?? ordenATamano.get(partido.rondaOrden ?? 0) ?? 2
    partidosPorTamano.set(tamano, [...(partidosPorTamano.get(tamano) ?? []), partido])
  })

  return tamanosPosibles.map((tamano) => {
    const partidosRonda = [...(partidosPorTamano.get(tamano) ?? [])].sort((a, b) => a.id - b.id)
    const cantidadEsperada = tamano / 2
    return {
      etiqueta: ETIQUETAS_RONDA[tamano] ?? `Ronda de ${tamano}`,
      partidos: Array.from({ length: cantidadEsperada }, (_, index) => partidosRonda[index] ?? null),
      tamano,
    }
  })
}
