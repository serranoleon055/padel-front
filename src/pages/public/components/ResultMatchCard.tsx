import { CalendarDays } from 'lucide-react'
import { memo } from 'react'
import { NavLink } from 'react-router-dom'

import { fechaCompacta, instanciaPartido } from '@/shared/lib/formatters'
import { obtenerLadoGanador, parsearMarcador } from '@/shared/lib/score'
import type { SetMarcador } from '@/shared/lib/score'
import type { PartidoResponse } from '@/shared/types/api'
import { NombreParejaApilado } from '@/shared/ui/NombreParejaApilado'

type PropsResultado = {
  elemento: PartidoResponse
}

function TarjetaResultadoInterna({ elemento }: PropsResultado) {
  const sets = parsearMarcador(elemento.marcador)
  const ladoGanador = obtenerLadoGanador(elemento)
  const instancia = instanciaPartido(elemento)

  return (
    <article className="match-card">
      <div className="mc-head">
        <span className="mc-tournament">
          {elemento.torneoId ? <NavLink to={`/torneos/${elemento.torneoId}`} className="hover:underline">{elemento.torneoNombre ?? 'Torneo'}</NavLink> : (elemento.torneoNombre ?? 'Torneo')}
        </span>
        {instancia ? <span className="mc-round">{instancia.toUpperCase()}</span> : null}
      </div>

      <div className="scoreboard">
        <FilaPareja
          jugadores={[elemento.jugadorLocal1Nombre, elemento.jugadorLocal2Nombre]}
          jugadoresIds={[elemento.jugadorLocal1Id, elemento.jugadorLocal2Id]}
          sets={sets} lado="local" ganador={ladoGanador === 'local'}
        />
        <FilaPareja
          jugadores={[elemento.jugadorVisitante1Nombre, elemento.jugadorVisitante2Nombre]}
          jugadoresIds={[elemento.jugadorVisitante1Id, elemento.jugadorVisitante2Id]}
          sets={sets} lado="visitante" ganador={ladoGanador === 'visitante'}
        />
      </div>

      <div className="mc-footer">
        <div className="mc-footer-info">
          <CalendarDays size={15} />
          {`${fechaCompacta(elemento.fechaHora)} · ${elemento.lugarNombre ?? 'Sede a confirmar'}`}
        </div>
        {elemento.categoriaId
          ? <NavLink to={`/ranking?categoria=${elemento.categoriaId}`} className="mc-cat hover:underline">{elemento.categoriaNombre ?? 'Categoría'}</NavLink>
          : <span className="mc-cat">{elemento.categoriaNombre ?? 'Categoría'}</span>}
      </div>
    </article>
  )
}

function FilaPareja({ jugadores, jugadoresIds, sets, lado, ganador }: {
  jugadores: Array<string | null>
  jugadoresIds: Array<number | null>
  sets: SetMarcador[]
  lado: 'local' | 'visitante'
  ganador: boolean
}) {
  return (
    <div className={`sb-row ${ganador ? 'ganador' : 'perdedor'}`}>
      <div className="sb-players">
        <NombreParejaApilado jugadores={jugadores} jugadoresIds={jugadoresIds} className="sb-name" />
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

export const ResultMatchCard = memo(TarjetaResultadoInterna)
