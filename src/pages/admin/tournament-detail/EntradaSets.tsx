import { useState } from 'react'

import { esColumnaSuperTiebreak, FORMATOS_PARTIDO } from '@/shared/lib/formatoPartido'
import { parsearMarcador } from '@/shared/lib/score'
import type { FormatoPartido } from '@/shared/types/api'
import { NombreParejaApilado } from '@/shared/ui/NombreParejaApilado'

type LadoSet = 'local' | 'visitante'

export function EntradaSets({ formato, valorInicial, onChange, localJugadores, visitanteJugadores }: {
  formato: FormatoPartido
  valorInicial: string
  onChange: (marcador: string) => void
  localJugadores: string[]
  visitanteJugadores: string[]
}) {
  const reglas = FORMATOS_PARTIDO[formato]
  const cantidadSets = reglas.maximoSets

  const [filas, setFilas] = useState(() => {
    const sets = parsearMarcador(valorInicial)
    return Array.from({ length: cantidadSets }, (_, i) => ({
      local: sets[i]?.local ?? '',
      visitante: sets[i]?.visitante ?? '',
    }))
  })

  // El super tie-break llega a 10 o más: es la única casilla que lleva dos dígitos.
  const digitos = (indice: number) => (esColumnaSuperTiebreak(formato, indice) ? 2 : 1)

  function actualizar(indice: number, lado: LadoSet, valorCrudo: string) {
    const limpio = valorCrudo.replace(/[^0-9]/g, '').slice(0, digitos(indice))
    const siguientes = filas.map((fila, i) => (i === indice ? { ...fila, [lado]: limpio } : fila))
    setFilas(siguientes)

    const completas: string[] = []
    for (const fila of siguientes) {
      if (fila.local !== '' && fila.visitante !== '') completas.push(`${fila.local}-${fila.visitante}`)
      else break
    }
    onChange(completas.join(' / '))
  }

  function casillas(lado: LadoSet) {
    return filas.map((fila, i) => (
      <input
        key={i}
        type="text"
        inputMode="numeric"
        maxLength={digitos(i)}
        value={fila[lado]}
        onChange={(e) => actualizar(i, lado, e.target.value)}
        className="h-10 w-10 rounded-md border border-rp-border bg-rp-surface text-center text-base font-black text-rp-text focus:border-rp-accent focus:outline-none focus:ring-1 focus:ring-rp-accent/40"
      />
    ))
  }

  function titulo(indice: number) {
    if (esColumnaSuperTiebreak(formato, indice)) return 'STB'
    if (cantidadSets === 1) return reglas.gamesPorSet === 9 ? 'A 9' : 'Set'
    return `Set ${indice + 1}`
  }

  return (
    <div className="rounded-lg border border-rp-border bg-rp-bg/45 p-3">
      <div className="grid items-center gap-x-2 gap-y-2.5" style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${cantidadSets}, 2.5rem)` }}>
        <span className="text-[10px] font-black uppercase tracking-[0.12em] text-rp-muted">Pareja</span>
        {filas.map((_, i) => <span key={i} className="text-center text-[10px] font-black uppercase tracking-[0.12em] text-rp-muted" title={esColumnaSuperTiebreak(formato, i) ? 'Super tie-break' : undefined}>{titulo(i)}</span>)}

        <NombreParejaApilado jugadores={localJugadores} className="text-sm font-bold leading-tight text-rp-text" />
        {casillas('local')}

        <NombreParejaApilado jugadores={visitanteJugadores} className="text-sm font-bold leading-tight text-rp-text" />
        {casillas('visitante')}
      </div>
      <p className="mt-2.5 text-[11px] leading-4 text-rp-muted">{reglas.ayuda}</p>
    </div>
  )
}
