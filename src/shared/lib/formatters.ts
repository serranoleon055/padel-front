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

const formateadorMoneda = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

export function formatearMoneda(valor: number | null | undefined) {
  if (valor == null) {
    return 'Sin definir'
  }

  return formateadorMoneda.format(valor)
}

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

  if (tamano === 64 || normalizado.includes('treintaidosavo') || normalizado.includes('32avo')) return 'Treintaidosavos de final'
  if (tamano === 32 || normalizado.includes('dieciseisavo') || normalizado.includes('16avo')) return 'Dieciseisavos de final'
  if (tamano === 16 || normalizado.includes('octavo')) return 'Octavos de final'
  if (tamano === 8 || normalizado.includes('cuarto')) return 'Cuartos de final'
  if (tamano === 4 || normalizado.includes('semi')) return 'Semifinales'
  if (tamano === 2 || normalizado === 'final' || normalizado.includes(' final')) return 'Final'
  return valor
}

export function nombresPareja(partido: PartidoResponse, lado: 'local' | 'visitante'): string[] {
  const nombres = lado === 'local'
    ? [partido.jugadorLocal1Nombre, partido.jugadorLocal2Nombre]
    : [partido.jugadorVisitante1Nombre, partido.jugadorVisitante2Nombre]
  const presentes = nombres.filter(Boolean) as string[]
  if (presentes.length > 0) return presentes
  return [lado === 'local' ? 'Pareja local' : 'Pareja visitante']
}

export function formatearPareja(partido: PartidoResponse, lado: 'local' | 'visitante') {
  return nombresPareja(partido, lado).join(' / ')
}

export function formatearEtapaPartido(partido: PartidoResponse) {
  return formatearNombreRonda(partido.ronda) ?? partido.grupoNombre ?? formatearEnum(partido.fase)
}

export function instanciaPartido(partido: PartidoResponse): string | null {
  const ronda = formatearNombreRonda(partido.ronda)
  if (ronda) return ronda

  const grupo = partido.grupoNombre?.trim()
  const categoria = partido.categoriaNombre?.trim().toLowerCase() ?? ''
  if (grupo) {
    const grupoNormalizado = grupo.toLowerCase()
    const esRedundanteConCategoria =
      categoria !== '' && (grupoNormalizado.includes(categoria) || categoria.includes(grupoNormalizado))
    if (!esRedundanteConCategoria) return grupo
  }

  return null
}

function quitarTokensRedundantes(tokens: string[]): string[] {
  const limpios = tokens.map((token) => token.trim()).filter(Boolean)
  return limpios.filter((token, indice) =>
    !limpios.some((otro, otroIndice) => {
      if (otroIndice === indice) return false
      const contiene = otro.toLowerCase().includes(token.toLowerCase())
      return contiene && (otro.length > token.length || otroIndice < indice)
    }),
  )
}

export function metaPartido(partido: PartidoResponse, opciones?: { incluirTorneo?: boolean }): string[] {
  const tokens: string[] = []
  if (opciones?.incluirTorneo && partido.torneoNombre) tokens.push(partido.torneoNombre)
  if (partido.categoriaNombre) tokens.push(partido.categoriaNombre)

  const fechaPartido = partido.fechaHora ?? partido.fechaHoraProgramada
  const instancia = instanciaPartido(partido) ?? (fechaPartido ? fechaCompacta(fechaPartido) : null)
  if (instancia) tokens.push(instancia)

  return quitarTokensRedundantes(tokens)
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
