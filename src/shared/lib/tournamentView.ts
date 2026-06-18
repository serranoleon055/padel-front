import { formatearNombreRonda } from '@/shared/lib/formatters'
import type { GrupoResponse, ParejaResponse, PartidoResponse } from '@/shared/types/api'

export function coincidePrefijoNombre(valor: string | null | undefined, busqueda: string) {
  const busquedaNormalizada = busqueda.trim().toLowerCase()
  if (!busquedaNormalizada) return true
  return (valor ?? '').trim().toLowerCase().startsWith(busquedaNormalizada)
}

export function nombreCompletoEmpiezaCon(nombre: string, apellido: string, busqueda: string) {
  return coincidePrefijoNombre(`${nombre} ${apellido}`, busqueda) || coincidePrefijoNombre(nombre, busqueda) || coincidePrefijoNombre(apellido, busqueda)
}

export function obtenerNombresCategoriasDeTorneo<T extends { categorias: Array<{ nombre: string }> }>(torneo: T) {
  return torneo.categorias.map((categoria) => categoria.nombre)
}

export function parejasPorCategoria(parejas: ParejaResponse[]) {
  return parejas.reduce<Record<string, ParejaResponse[]>>((acumulador, pareja) => {
    const clave = pareja.categoriaNombre || 'Sin categoría'
    acumulador[clave] = [...(acumulador[clave] ?? []), pareja]
    return acumulador
  }, {})
}

export function partidosPorCategoria(partidos: PartidoResponse[]) {
  return partidos.reduce<Record<string, PartidoResponse[]>>((acumulador, partido) => {
    const clave = partido.categoriaNombre || 'Sin categoría'
    acumulador[clave] = [...(acumulador[clave] ?? []), partido]
    return acumulador
  }, {})
}

export function gruposPorCategoria(grupos: GrupoResponse[]) {
  return grupos.reduce<Record<string, GrupoResponse[]>>((acumulador, grupo) => {
    const clave = grupo.categoriaNombre || 'Sin categoría'
    acumulador[clave] = [...(acumulador[clave] ?? []), grupo]
    return acumulador
  }, {})
}

export function obtenerPartidoCampeon(partidos: PartidoResponse[]) {
  const finalizados = partidos.filter((partido) => partido.estado === 'FINALIZADO')
  return finalizados
    .filter(esPartidoFinal)
    .filter((partido) => partido.ganadorNombre)
    .sort((a, b) => (b.rondaOrden ?? 0) - (a.rondaOrden ?? 0) || b.id - a.id)[0] ?? null
}

export function esPartidoFinal(partido: PartidoResponse) {
  return formatearNombreRonda(partido.ronda)?.toLowerCase() === 'final'
}

export function obtenerNombreSubcampeon(partido: PartidoResponse | null) {
  if (!partido?.ganadorId) return null
  if (partido.ganadorId === partido.parejaLocalId) {
    return [partido.jugadorVisitante1Nombre, partido.jugadorVisitante2Nombre].filter(Boolean).join(' / ') || null
  }
  if (partido.ganadorId === partido.parejaVisitanteId) {
    return [partido.jugadorLocal1Nombre, partido.jugadorLocal2Nombre].filter(Boolean).join(' / ') || null
  }
  return null
}

export function ordenarPartidosCuadro(partidos: PartidoResponse[]) {
  return [...partidos].sort((a, b) => (a.rondaOrden ?? 0) - (b.rondaOrden ?? 0) || a.id - b.id)
}

export function obtenerCampeonLiga(grupos: GrupoResponse[]) {
  const posiciones = grupos.flatMap((grupo) => grupo.posiciones ?? [])
  const algunaJugada = posiciones.some((posicion) => posicion.pj > 0)
  if (!algunaJugada) return { campeon: null, subcampeon: null }
  const ordenadas = grupos.length > 1
    ? [...posiciones].sort((a, b) => b.puntos - a.puntos || (b.setsGanados - b.setsPerdidos) - (a.setsGanados - a.setsPerdidos))
    : posiciones
  return {
    campeon: ordenadas[0]?.parejaNombre ?? null,
    subcampeon: ordenadas[1]?.parejaNombre ?? null,
  }
}
