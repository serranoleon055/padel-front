import { memo } from 'react'
import type { CSSProperties } from 'react'
import { NavLink } from 'react-router-dom'

const estiloApilado: CSSProperties = { display: 'flex', flexDirection: 'column', minWidth: 0 }

type NombreParejaApiladoProps = {
  jugadores: Array<string | null | undefined>
  jugadoresIds?: Array<number | null | undefined>
  className?: string
}

export const NombreParejaApilado = memo(function NombreParejaApilado({ jugadores, jugadoresIds, className }: NombreParejaApiladoProps) {
  const lineas = jugadores
    .map((nombre, indice) => ({ nombre, id: jugadoresIds?.[indice] ?? null }))
    .filter((linea) => Boolean(linea.nombre))
  const visibles = lineas.length > 0 ? lineas : [{ nombre: 'Sin jugadores', id: null }]

  return (
    <span className={className} style={estiloApilado}>
      {visibles.map((linea, indice) => (
        linea.id != null
          ? <NavLink key={indice} to={`/jugadores/${linea.id}`} className="hover:underline" onClick={(evento) => evento.stopPropagation()}>{linea.nombre}</NavLink>
          : <span key={indice}>{linea.nombre}</span>
      ))}
    </span>
  )
})
