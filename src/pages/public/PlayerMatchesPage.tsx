import { useEffect, useMemo, useState } from 'react'
import { useParams, NavLink } from 'react-router-dom'
import { ArrowLeft, Medal } from 'lucide-react'

import { playersApi } from '@/features/players/playersApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import type { JugadorHistorialResponse } from '@/shared/types/api'
import { Pagination } from '@/shared/ui/Pagination'
import { StatusMessage } from '@/shared/ui/StatusMessage'
import { TarjetaPartidoJugador } from '@/pages/public/components/TarjetaPartidoJugador'

const PARTIDOS_POR_PAGINA = 10

export default function PlayerMatchesPage() {
  const { jugadorId } = useParams()
  const id = Number(jugadorId)

  const [historial, setHistorial] = useState<JugadorHistorialResponse | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagina, setPagina] = useState(1)

  useEffect(() => {
    if (!Number.isFinite(id)) return
    setCargando(true)
    playersApi.getHistorial(id)
      .then((datos) => { setHistorial(datos); setError(null) })
      .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
      .finally(() => setCargando(false))
  }, [id])

  const partidos = historial?.partidos ?? []

  const partidosPaginados = useMemo(() => {
    const inicio = (pagina - 1) * PARTIDOS_POR_PAGINA
    return partidos.slice(inicio, inicio + PARTIDOS_POR_PAGINA)
  }, [partidos, pagina])

  if (cargando) return (
    <div className="flex min-h-[60svh] items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-2 border-rp-accent border-t-transparent" />
    </div>
  )

  if (error) return <StatusMessage type="error" title="Error" description={error} />
  if (!historial) return null

  const { jugador } = historial

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <NavLink to={`/jugadores/${id}`} className="mb-6 flex items-center gap-2 text-sm" style={{ color: 'var(--rp-muted-light)' }}>
        <ArrowLeft size={15} /> Volver al perfil
      </NavLink>

      <h1 className="flex items-center gap-2 text-2xl font-black" style={{ color: 'var(--rp-green-800)' }}>
        <Medal size={20} /> Partidos de {jugador.nombre} {jugador.apellido}
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--rp-muted-light)' }}>
        {partidos.length} {partidos.length === 1 ? 'partido registrado' : 'partidos registrados'}
      </p>

      {partidos.length > 0 ? (
        <>
          <div className="mt-6 space-y-2">
            {partidosPaginados.map((partido) => (
              <TarjetaPartidoJugador key={partido.id} partido={partido} jugadorId={id} />
            ))}
          </div>
          <Pagination page={pagina} pageSize={PARTIDOS_POR_PAGINA} total={partidos.length} onPageChange={setPagina} />
        </>
      ) : (
        <div className="mt-6">
          <StatusMessage type="empty" title="Sin partidos" description="Este jugador todavía no tiene partidos registrados." />
        </div>
      )}
    </main>
  )
}
