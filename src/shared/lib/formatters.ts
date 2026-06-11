import type { PartidoResponse } from '@/shared/types/api'

const formateadorFecha = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const formateadorFechaHora = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatearFecha(valor: string | null | undefined) {
  if (!valor) {
    return 'Sin fecha'
  }

  return formateadorFecha.format(new Date(`${valor}T00:00:00`))
}

export function formatearFechaHora(valor: string | null | undefined) {
  if (!valor) {
    return 'Sin horario'
  }

  return formateadorFechaHora.format(new Date(valor))
}

export function formatearEnum(valor: string | null | undefined) {
  if (!valor) {
    return 'Sin dato'
  }

  return valor
    .toLowerCase()
    .split('_')
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ')
}

export function formatearNombreRonda(valor: string | null | undefined) {
  if (!valor) return null
  const normalizado = valor.trim().toLowerCase()
  const tamanoExplicito = normalizado.match(/ronda\s+de\s+(\d+)/)?.[1]
  const tamano = tamanoExplicito ? Number(tamanoExplicito) : null

  if (tamano === 16 || normalizado.includes('octavo')) return 'Octavos de final'
  if (tamano === 8 || normalizado.includes('cuarto')) return 'Cuartos de final'
  if (tamano === 4 || normalizado.includes('semi')) return 'Semifinales'
  if (tamano === 2 || normalizado === 'final' || normalizado.includes(' final')) return 'Final'
  return valor
}

export function formatearPareja(partido: PartidoResponse, lado: 'local' | 'visitante') {
  if (lado === 'local') {
    return [partido.jugadorLocal1Nombre, partido.jugadorLocal2Nombre].filter(Boolean).join(' / ') || 'Pareja local'
  }

  return (
    [partido.jugadorVisitante1Nombre, partido.jugadorVisitante2Nombre].filter(Boolean).join(' / ') ||
    'Pareja visitante'
  )
}

export function formatearEtapaPartido(partido: PartidoResponse) {
  return formatearNombreRonda(partido.ronda) ?? partido.grupoNombre ?? formatearEnum(partido.fase)
}

export function formatearEstadoPartido(estado: string | null | undefined): string {
  switch (estado) {
    case 'PENDIENTE': return 'Pendiente'
    case 'EN_CURSO': return 'En curso'
    case 'FINALIZADO': return 'Finalizado'
    case 'BYE': return 'Libre (BYE)'
    case 'WALKOVER': return 'W.O.'
    case 'RETIRO': return 'Retiro'
    default: return estado ?? 'Sin estado'
  }
}

export function formatearFechaPartido(partido: PartidoResponse): string {
  if (partido.fechaHora) return formatearFechaHora(partido.fechaHora)
  if (partido.fechaHoraProgramada) return `${formatearFechaHora(partido.fechaHoraProgramada)} (programado)`
  return 'Sin horario'
}

const formateadorCompacto = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' })

export function fechaCompacta(valor: string | null | undefined) {
  if (!valor) return 'Sin fecha'
  return formateadorCompacto
    .format(new Date(valor.includes('T') ? valor : `${valor}T00:00:00`))
    .replace('.', '')
}
