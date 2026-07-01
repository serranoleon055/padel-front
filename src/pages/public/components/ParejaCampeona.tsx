import { memo } from 'react'
import { NavLink } from 'react-router-dom'

type ParejaCampeonaProps = {
  j1Id: number | null
  j1Nombre: string | null
  j2Id: number | null
  j2Nombre: string | null
  fallback: string | null
}

function NombreJugadorLink({ id, nombre }: { id: number | null; nombre: string | null }) {
  if (!nombre) return null
  return id
    ? <NavLink to={`/jugadores/${id}`} className="hover:underline" onClick={(evento) => evento.stopPropagation()}>{nombre}</NavLink>
    : <span>{nombre}</span>
}

export const ParejaCampeona = memo(function ParejaCampeona({ j1Id, j1Nombre, j2Id, j2Nombre, fallback }: ParejaCampeonaProps) {
  if (!j1Nombre && !j2Nombre) return <>{fallback ?? 'Sin dato'}</>
  return (
    <span className="pareja-campeona">
      <NombreJugadorLink id={j1Id} nombre={j1Nombre} />
      {j2Nombre ? <NombreJugadorLink id={j2Id} nombre={j2Nombre} /> : null}
    </span>
  )
})
