import { formatearEnum, metaPartido } from '@/shared/lib/formatters'
import type { PartidoResponse } from '@/shared/types/api'

type TarjetaPartidoJugadorProps = {
  partido: PartidoResponse
  jugadorId: number
}

export function TarjetaPartidoJugador({ partido, jugadorId }: TarjetaPartidoJugadorProps) {
  const esLocal = partido.jugadorLocal1Id === jugadorId || partido.jugadorLocal2Id === jugadorId
  const esVisitante = partido.jugadorVisitante1Id === jugadorId || partido.jugadorVisitante2Id === jugadorId
  const hayResultado = partido.ganadorId != null
  const esGanador =
    (esLocal && partido.ganadorId === partido.parejaLocalId) ||
    (esVisitante && partido.ganadorId === partido.parejaVisitanteId)
  const meta = metaPartido(partido, { incluirTorneo: true }).join(' · ')

  return (
    <div
      className="rounded-lg border px-4 py-3"
      style={{
        borderColor: esGanador ? 'var(--rp-green-600)' : 'var(--rp-border-light)',
        background: esGanador ? 'rgba(47,104,64,0.06)' : '#fff',
        borderLeft: `4px solid ${esGanador ? 'var(--rp-green-600)' : hayResultado ? '#c0392b' : 'var(--rp-border-light)'}`,
      }}
    >
      <p className="text-xs" style={{ color: 'var(--rp-muted-light)' }}>{meta}</p>
      <div className="mt-2 flex flex-col gap-2 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-3">
        <div className="flex flex-col text-sm font-bold" style={{ color: 'var(--rp-green-800)' }}>
          <span className="whitespace-nowrap">{partido.jugadorLocal1Nombre}</span>
          <span className="whitespace-nowrap">{partido.jugadorLocal2Nombre}</span>
        </div>
        <div className="flex items-center gap-2 sm:flex-col sm:gap-1">
          <span className="whitespace-nowrap text-sm font-black" style={{ color: 'var(--rp-gold)' }}>{partido.marcador ?? formatearEnum(partido.estado)}</span>
          {hayResultado && (
            <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: esGanador ? 'var(--rp-green-600)' : '#c0392b' }}>
              {esGanador ? 'Victoria' : 'Derrota'}
            </span>
          )}
        </div>
        <div className="flex flex-col text-sm font-bold sm:text-right" style={{ color: 'var(--rp-green-800)' }}>
          <span className="whitespace-nowrap">{partido.jugadorVisitante1Nombre}</span>
          <span className="whitespace-nowrap">{partido.jugadorVisitante2Nombre}</span>
        </div>
      </div>
    </div>
  )
}
