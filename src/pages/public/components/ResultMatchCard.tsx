import { CalendarDays, Trophy, Users } from 'lucide-react'
import { memo } from 'react'

import { fechaCompacta, formatearEtapaPartido, formatearPareja } from '@/shared/lib/formatters'
import { obtenerTotalesSets, obtenerLadoGanador, parsearMarcador } from '@/shared/lib/score'
import type { PartidoResponse } from '@/shared/types/api'

type PropsResultado = {
  elemento: PartidoResponse
}

function TarjetaResultadoInterna({ elemento }: PropsResultado) {
  const local = formatearPareja(elemento, 'local')
  const visitante = formatearPareja(elemento, 'visitante')
  const sets = parsearMarcador(elemento.marcador)
  const totales = obtenerTotalesSets(sets)
  const ladoGanador = obtenerLadoGanador(elemento)
  const resultadoLocal = ladoGanador === 'local' ? 'Ganador' : ladoGanador === 'visitante' ? 'Perdedor' : 'Local'
  const resultadoVisitante = ladoGanador === 'visitante' ? 'Ganador' : ladoGanador === 'local' ? 'Perdedor' : 'Visitante'
  const totalLocal = sets.length > 0 ? totales.local : ladoGanador === 'local' ? 2 : 0
  const totalVisitante = sets.length > 0 ? totales.visitante : ladoGanador === 'visitante' ? 2 : 0

  return (
    <article className="match-card">
      <div className="mc-head">
        <span className="mc-tournament">{elemento.torneoNombre ?? 'Torneo'}</span>
        <span className="mc-round">{formatearEtapaPartido(elemento).toUpperCase()}</span>
      </div>

      <div className="scoreboard">
        <div className="sb-row">
          <div className="sb-team-info">
            <div className={`sb-icon ${ladoGanador === 'local' ? 'winner' : ''}`}>
              {ladoGanador === 'local' ? <Trophy size={20} /> : <Users size={20} />}
            </div>
            <div className="sb-players">
              <NombrePareja nombre={local} className={ladoGanador === 'local' ? 'winner' : ''} />
              <div className="sb-sub">{resultadoLocal}</div>
            </div>
          </div>
          <div className="sb-sets">
            {sets.map((set, index) => (
              <div key={index} className={`sb-set ${set.winner === 'local' ? 'winner' : ''}`}>{set.local}</div>
            ))}
          </div>
          <div className={`sb-total ${ladoGanador === 'local' ? 'winner' : ''}`}>{totalLocal}</div>
        </div>

        <div className="sb-row">
          <div className="sb-team-info">
            <div className={`sb-icon ${ladoGanador === 'visitante' ? 'winner' : ''}`}>
              {ladoGanador === 'visitante' ? <Trophy size={20} /> : <Users size={20} />}
            </div>
            <div className="sb-players">
              <NombrePareja nombre={visitante} className={ladoGanador === 'visitante' ? 'winner' : ''} />
              <div className="sb-sub">{resultadoVisitante}</div>
            </div>
          </div>
          <div className="sb-sets">
            {sets.map((set, index) => (
              <div key={index} className={`sb-set ${set.winner === 'visitante' ? 'winner' : ''}`}>{set.visitante}</div>
            ))}
          </div>
          <div className={`sb-total ${ladoGanador === 'visitante' ? 'winner' : ''}`}>{totalVisitante}</div>
        </div>
      </div>

      <div className="mc-footer">
        <div className="mc-footer-info">
          <CalendarDays size={15} />
          {`${fechaCompacta(elemento.fechaHora)} - ${elemento.lugarNombre ?? 'Sede a confirmar'}`}
        </div>
        <span className="mc-cat">{elemento.categoriaNombre ?? 'Categoría'}</span>
      </div>
    </article>
  )
}

function NombrePareja({ className = '', nombre }: { className?: string; nombre: string }) {
  const jugadores = nombre.split(' / ').filter(Boolean)
  if (jugadores.length !== 2) {
    return <div className={`sb-name ${className}`}>{nombre}</div>
  }

  return (
    <div className={`sb-name ${className}`}>
      <span className="pair-line">{jugadores[0]} /</span>
      <span className="pair-line">{jugadores[1]}</span>
    </div>
  )
}

export const ResultMatchCard = memo(TarjetaResultadoInterna)
