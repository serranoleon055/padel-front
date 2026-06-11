import { CalendarDays } from 'lucide-react'
import { memo } from 'react'

import { fechaCompacta, formatearEtapaPartido, formatearPareja } from '@/shared/lib/formatters'
import { obtenerLadoGanador, parsearMarcador } from '@/shared/lib/score'
import type { SetMarcador } from '@/shared/lib/score'
import type { PartidoResponse } from '@/shared/types/api'

type PropsResultado = {
  elemento: PartidoResponse
}

function TarjetaResultadoInterna({ elemento }: PropsResultado) {
  const local = formatearPareja(elemento, 'local')
  const visitante = formatearPareja(elemento, 'visitante')
  const sets = parsearMarcador(elemento.marcador)
  const ladoGanador = obtenerLadoGanador(elemento)

  return (
    <article className="match-card">
      <div className="mc-head">
        <span className="mc-tournament">{elemento.torneoNombre ?? 'Torneo'}</span>
        <span className="mc-round">{formatearEtapaPartido(elemento).toUpperCase()}</span>
      </div>

      <div className="scoreboard">
        <FilaPareja nombre={local} sets={sets} lado="local" ganador={ladoGanador === 'local'} />
        <FilaPareja nombre={visitante} sets={sets} lado="visitante" ganador={ladoGanador === 'visitante'} />
      </div>

      <div className="mc-footer">
        <div className="mc-footer-info">
          <CalendarDays size={15} />
          {`${fechaCompacta(elemento.fechaHora)} · ${elemento.lugarNombre ?? 'Sede a confirmar'}`}
        </div>
        <span className="mc-cat">{elemento.categoriaNombre ?? 'Categoría'}</span>
      </div>
    </article>
  )
}

function FilaPareja({ nombre, sets, lado, ganador }: {
  nombre: string
  sets: SetMarcador[]
  lado: 'local' | 'visitante'
  ganador: boolean
}) {
  return (
    <div className={`sb-row ${ganador ? 'ganador' : 'perdedor'}`}>
      <div className="sb-players">
        <NombrePareja nombre={nombre} />
      </div>
      <div className="sb-mark">
        {ganador ? <span className="sb-w" aria-label="Ganador">W</span> : null}
      </div>
      <div className="sb-sets">
        {sets.length === 0 ? (
          <span className="sb-set lost">–</span>
        ) : (
          sets.map((set, index) => {
            const valor = lado === 'local' ? set.local : set.visitante
            const gano = set.winner === lado
            return (
              <span key={index} className={`sb-set ${gano ? 'won' : 'lost'}`}>{valor}</span>
            )
          })
        )}
      </div>
    </div>
  )
}

function NombrePareja({ nombre }: { nombre: string }) {
  const jugadores = nombre.split(' / ').filter(Boolean)
  if (jugadores.length !== 2) {
    return <div className="sb-name">{nombre}</div>
  }

  return (
    <div className="sb-name">
      <span className="pair-line">{jugadores[0]} /</span>
      <span className="pair-line">{jugadores[1]}</span>
    </div>
  )
}

export const ResultMatchCard = memo(TarjetaResultadoInterna)
