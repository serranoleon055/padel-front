import { formatearEnum, formatearFecha, formatearPareja } from '@/shared/lib/formatters'
import type { HomeResponse } from '@/shared/types/api'

export function elementosTickerInicio(datos: HomeResponse | null) {
  if (!datos) return []

  const enVivo = datos.partidosEnVivo.slice(0, 4).map((partido) => ({
    label: partido.torneoNombre ?? 'En vivo',
    text: `${formatearPareja(partido, 'local')} vs ${formatearPareja(partido, 'visitante')} · en vivo`,
  }))
  const proximos = datos.proximosTorneos.slice(0, 4).map((torneo) => ({
    label: torneo.nombre,
    text: `${formatearEnum(torneo.estado)} · ${formatearFecha(torneo.fechaInicio)}`,
  }))
  const resultados = datos.ultimosResultados.slice(0, 6).map((partido) => ({
    label: partido.torneoNombre ?? 'Resultado',
    text: `${formatearPareja(partido, 'local')} vs ${formatearPareja(partido, 'visitante')}`,
  }))

  return [...enVivo, ...proximos, ...resultados].slice(0, 12)
}
