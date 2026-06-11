import { formatearEnum } from '@/shared/lib/formatters'
import { obtenerLadoGanador } from '@/shared/lib/score'
import type { PartidoResponse } from '@/shared/types/api'

type TarjetaPartidoJugadorProps = {
  partido: PartidoResponse
  jugadorId: number
}

export function TarjetaPartidoJugador({ partido, jugadorId }: TarjetaPartidoJugadorProps) {
  const ladoGanador = obtenerLadoGanador(partido)
  const esLocal = partido.jugadorLocal1Id === jugadorId || partido.jugadorLocal2Id === jugadorId
  const esVisitante = partido.jugadorVisitante1Id === jugadorId || partido.jugadorVisitante2Id === jugadorId
  const esGanador = (ladoGanador === 'local' && esLocal) || (ladoGanador === 'visitante' && esVisitante)
  const instancia = partido.ronda ?? partido.grupoNombre ?? formatearEnum(partido.fase)

  return (
    <div
      className="rounded-lg border px-4 py-3 transition-transform hover:-translate-y-0.5"
      style={{
        borderColor: esGanador ? 'var(--rp-green-600)' : 'var(--rp-border-light)',
        background: esGanador ? 'rgba(47,104,64,0.07)' : '#fff',
        borderLeft: `4px solid ${esGanador ? 'var(--rp-green-600)' : 'var(--rp-border-light)'}`,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs" style={{ color: 'var(--rp-muted-light)' }}>
          {partido.torneoNombre} · {instancia} · {partido.categoriaNombre}
        </div>
        <span className="text-xs font-black" style={{ color: esGanador ? 'var(--rp-green-600)' : '#c0392b' }}>
          {esGanador ? 'Victoria' : 'Derrota'}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-3 items-center text-sm">
        <span className="text-left font-bold" style={{ color: 'var(--rp-green-800)' }}>
          {partido.jugadorLocal1Nombre} / {partido.jugadorLocal2Nombre}
        </span>
        <span className="text-center font-black" style={{ color: 'var(--rp-gold)' }}>
          {partido.marcador ?? formatearEnum(partido.estado)}
        </span>
        <span className="text-right font-bold" style={{ color: 'var(--rp-green-800)' }}>
          {partido.jugadorVisitante1Nombre} / {partido.jugadorVisitante2Nombre}
        </span>
      </div>
    </div>
  )
}
