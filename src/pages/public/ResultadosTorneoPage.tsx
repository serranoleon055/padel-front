import { ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'

import { tournamentsApi } from '@/features/tournaments/tournamentsApi'
import { ordenarCategorias } from '@/shared/lib/categorias'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { fechaCompacta, formatearEtapaPartido, formatearNombreRonda, nombresPareja } from '@/shared/lib/formatters'
import { obtenerLadoGanador, parsearMarcador } from '@/shared/lib/score'
import type { SetMarcador } from '@/shared/lib/score'
import type { PartidoResponse, TorneoDetalleResponse } from '@/shared/types/api'
import { Button } from '@/shared/ui/Button'
import { NavegadorFase } from '@/shared/ui/NavegadorFase'
import { NombreParejaApilado } from '@/shared/ui/NombreParejaApilado'
import { Select } from '@/shared/ui/Select'
import { StatusMessage } from '@/shared/ui/StatusMessage'

type Tramo = { clave: string; etiqueta: string; partidos: PartidoResponse[] }

export default function ResultadosTorneoPage() {
  const { torneoId } = useParams()
  const torneoIdNumerico = Number(torneoId)
  const torneoIdValido = Number.isFinite(torneoIdNumerico)

  const [detalle, setDetalle] = useState<TorneoDetalleResponse | null>(null)
  const [cargando, setCargando] = useState(torneoIdValido)
  const [error, setError] = useState<string | null>(null)
  const [categoria, setCategoria] = useState('')
  const [vista, setVista] = useState<'GRUPOS' | 'ELIMINACION'>('GRUPOS')
  const [indice, setIndice] = useState(0)

  useEffect(() => {
    if (!torneoIdValido) return
    let montado = true
    tournamentsApi.getDetail(torneoIdNumerico)
      .then((datos) => {
        if (!montado) return
        setDetalle(datos)
        setCategoria(ordenarCategorias(datos.torneo.categorias)[0]?.nombre ?? '')
        setError(null)
      })
      .catch((e: unknown) => { if (montado) setError(obtenerMensajeErrorApi(e)) })
      .finally(() => { if (montado) setCargando(false) })
    return () => { montado = false }
  }, [torneoIdValido, torneoIdNumerico])

  const esLiga = detalle?.torneo.formato === 'LIGA'

  const categorias = useMemo(
    () => (detalle ? ordenarCategorias(detalle.torneo.categorias).map((c) => c.nombre) : []),
    [detalle],
  )

  const finalizados = useMemo(() => {
    if (!detalle) return []
    return detalle.partidos.filter((partido) =>
      partido.estado === 'FINALIZADO' && partido.marcador &&
      (!categoria || partido.categoriaNombre === categoria))
  }, [detalle, categoria])

  const hayGrupos = useMemo(() => finalizados.some((p) => p.fase === 'GRUPOS'), [finalizados])
  const hayEliminacion = useMemo(() => finalizados.some((p) => p.fase === 'ELIMINACION'), [finalizados])

  useEffect(() => {
    if (esLiga) return
    if (vista === 'GRUPOS' && !hayGrupos && hayEliminacion) setVista('ELIMINACION')
    if (vista === 'ELIMINACION' && !hayEliminacion && hayGrupos) setVista('GRUPOS')
  }, [esLiga, vista, hayGrupos, hayEliminacion])

  useEffect(() => { setIndice(0) }, [categoria, vista])

  const tramos = useMemo<Tramo[]>(() => {
    if (esLiga) {
      const porFecha = new Map<number | null, PartidoResponse[]>()
      for (const partido of finalizados) {
        const clave = partido.jornada ?? null
        if (!porFecha.has(clave)) porFecha.set(clave, [])
        porFecha.get(clave)!.push(partido)
      }
      return Array.from(porFecha.entries())
        .sort((a, b) => (a[0] ?? Infinity) - (b[0] ?? Infinity))
        .map(([jornada, partidos]) => ({
          clave: `fecha-${jornada ?? 'sin'}`,
          etiqueta: jornada != null ? `Fecha ${jornada}` : 'Sin fecha',
          partidos,
        }))
    }

    if (vista === 'GRUPOS') {
      const porGrupo = new Map<string, PartidoResponse[]>()
      for (const partido of finalizados.filter((p) => p.fase === 'GRUPOS')) {
        const clave = partido.grupoNombre ?? 'Grupo'
        if (!porGrupo.has(clave)) porGrupo.set(clave, [])
        porGrupo.get(clave)!.push(partido)
      }
      return Array.from(porGrupo.keys()).sort((a, b) => a.localeCompare(b, 'es'))
        .map((nombre) => ({ clave: `grupo-${nombre}`, etiqueta: nombre, partidos: porGrupo.get(nombre)! }))
    }

    const porRonda = new Map<string, { orden: number; partidos: PartidoResponse[] }>()
    for (const partido of finalizados.filter((p) => p.fase === 'ELIMINACION')) {
      const clave = partido.ronda ?? 'Eliminatorias'
      if (!porRonda.has(clave)) porRonda.set(clave, { orden: partido.rondaOrden ?? 999, partidos: [] })
      porRonda.get(clave)!.partidos.push(partido)
    }
    return Array.from(porRonda.entries()).sort((a, b) => a[1].orden - b[1].orden)
      .map(([nombre, datos]) => ({ clave: `ronda-${nombre}`, etiqueta: formatearNombreRonda(nombre) ?? nombre, partidos: datos.partidos }))
  }, [esLiga, vista, finalizados])

  if (!torneoIdValido) {
    return <section className="mx-auto max-w-3xl px-4 py-12"><StatusMessage type="error" title="El ID del torneo no es válido" /></section>
  }
  if (cargando) {
    return <section className="mx-auto max-w-3xl px-4 py-12"><StatusMessage type="loading" title="Cargando resultados..." /></section>
  }
  if (error || !detalle) {
    return <section className="mx-auto max-w-3xl px-4 py-12"><StatusMessage type="error" title="No se pudo cargar el torneo" description={error ?? undefined} /></section>
  }

  const total = tramos.length
  const indiceSeguro = Math.min(indice, Math.max(0, total - 1))
  const tramo = tramos[indiceSeguro] ?? null

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <Button variant="subtle" size="sm" asChild>
        <NavLink to={`/torneos/${torneoIdNumerico}`}><ArrowLeft size={16} />Volver al torneo</NavLink>
      </Button>

      <h1 className="mt-4 text-3xl font-black text-rp-text sm:text-4xl">Resultados · {detalle.torneo.nombre}</h1>
      <p className="mt-2 text-sm text-rp-muted">Todos los partidos jugados del torneo.</p>

      <div className="mt-6">
        <Select label="Categoría" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          {categorias.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
        </Select>
      </div>

      {!esLiga && hayGrupos && hayEliminacion && (
        <div className="mt-4 flex gap-1 rounded-lg border border-rp-border bg-rp-surface/82 p-1">
          {(['GRUPOS', 'ELIMINACION'] as const).map((opcion) => (
            <button
              key={opcion}
              onClick={() => setVista(opcion)}
              className={`flex-1 rounded-md py-2 text-sm font-bold transition ${vista === opcion ? 'bg-rp-surface-2 text-rp-accent' : 'text-rp-muted hover:text-rp-text'}`}
            >
              {opcion === 'GRUPOS' ? 'Fase de grupos' : 'Eliminatorias'}
            </button>
          ))}
        </div>
      )}

      {total === 0 || !tramo ? (
        <div className="mt-6"><StatusMessage type="empty" title="Sin resultados" description="No hay partidos jugados con estos filtros." /></div>
      ) : (
        <>
          <div className="mt-4">
            <NavegadorFase
              etiqueta={tramo.etiqueta}
              indice={indiceSeguro}
              total={total}
              onAnterior={() => setIndice((indiceSeguro - 1 + total) % total)}
              onSiguiente={() => setIndice((indiceSeguro + 1) % total)}
            />
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {tramo.partidos.map((partido) => <TarjetaResultado key={partido.id} partido={partido} />)}
          </div>
        </>
      )}
    </section>
  )
}

function TarjetaResultado({ partido }: { partido: PartidoResponse }) {
  const sets = parsearMarcador(partido.marcador)
  const ladoGanador = obtenerLadoGanador(partido)

  return (
    <article className="rounded-lg border border-rp-border bg-rp-surface/82 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-wide text-rp-muted">{formatearEtapaPartido(partido)} · {partido.categoriaNombre}</span>
        <span className="text-xs text-rp-muted">{fechaCompacta(partido.fechaHora)}</span>
      </div>
      <div className="mt-2 flex flex-col gap-1">
        <FilaResultado jugadores={nombresPareja(partido, 'local')} sets={sets} lado="local" ganador={ladoGanador === 'local'} />
        <FilaResultado jugadores={nombresPareja(partido, 'visitante')} sets={sets} lado="visitante" ganador={ladoGanador === 'visitante'} />
      </div>
    </article>
  )
}

function FilaResultado({ jugadores, sets, lado, ganador }: {
  jugadores: string[]
  sets: SetMarcador[]
  lado: 'local' | 'visitante'
  ganador: boolean
}) {
  return (
    <div className={`flex items-center justify-between gap-3 text-sm ${ganador ? 'font-black text-rp-accent' : 'font-bold text-rp-text'}`}>
      <NombreParejaApilado jugadores={jugadores} />
      <div className="flex shrink-0 gap-1">
        {sets.length === 0 ? (
          <span className="text-rp-muted">—</span>
        ) : (
          sets.map((set, indice) => {
            const valor = lado === 'local' ? set.local : set.visitante
            const gano = set.winner === lado
            return (
              <span key={indice} className={`flex size-6 items-center justify-center rounded text-xs font-black ${gano ? 'bg-rp-accent/15 text-rp-accent' : 'bg-rp-bg/55 text-rp-muted'}`}>{valor}</span>
            )
          })
        )}
      </div>
    </div>
  )
}
