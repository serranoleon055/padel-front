import { ArrowLeft, MapPin, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'

import { tournamentsApi } from '@/features/tournaments/tournamentsApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { diaDe, etiquetaDia, horaDe } from '@/shared/lib/fixture'
import { instanciaPartido } from '@/shared/lib/formatters'
import { normalizarTexto } from '@/shared/lib/texto'
import type { PartidoResponse, TorneoResponse } from '@/shared/types/api'
import { Button } from '@/shared/ui/Button'
import { StatusMessage } from '@/shared/ui/StatusMessage'

const nombres = (p: PartidoResponse, lado: 'local' | 'visitante') => (lado === 'local'
  ? [p.jugadorLocal1Nombre, p.jugadorLocal2Nombre]
  : [p.jugadorVisitante1Nombre, p.jugadorVisitante2Nombre]).filter(Boolean) as string[]

function mapa(nombre: string | null, direccion: string | null | undefined) {
  const texto = [nombre, direccion].filter(Boolean).join(', ')
  return texto ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(texto)}` : null
}

/**
 * Todos los horarios del torneo para el jugador: por día, con el club, la cancha y cómo
 * llegar. Arriba, "¿Cuándo juego?": escribe su nombre y ve solo lo suyo. Es el enlace
 * que va en los avisos por WhatsApp.
 */
export default function HorariosTorneoPage() {
  const { torneoId } = useParams<{ torneoId: string }>()
  const id = Number(torneoId)
  const [torneo, setTorneo] = useState<TorneoResponse | null>(null)
  const [partidos, setPartidos] = useState<PartidoResponse[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [dia, setDia] = useState('')
  const [club, setClub] = useState('')
  const [categoria, setCategoria] = useState('')

  useEffect(() => {
    if (!Number.isFinite(id)) return
    Promise.all([tournamentsApi.getById(id), tournamentsApi.getCalendario(id)])
      .then(([t, calendario]) => { setTorneo(t); setPartidos(calendario.filter((p) => p.fechaHoraProgramada)) })
      .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
  }, [id])

  const direcciones = useMemo(() => new Map((torneo?.sedes ?? []).map((s) => [s.lugarId, s.direccion])), [torneo])
  const variosClubes = (torneo?.sedes?.length ?? 0) > 1
  const dias = useMemo(() => [...new Set((partidos ?? []).map((p) => diaDe(p.fechaHoraProgramada!)))].sort(), [partidos])
  const categorias = useMemo(() => [...new Set((partidos ?? []).map((p) => p.categoriaNombre).filter(Boolean))] as string[], [partidos])

  const texto = normalizarTexto(busqueda.trim())
  const juega = (p: PartidoResponse) => texto.length >= 3
    && [...nombres(p, 'local'), ...nombres(p, 'visitante')].some((n) => normalizarTexto(n).includes(texto))

  const visibles = useMemo(() => (partidos ?? [])
    .filter((p) => !dia || diaDe(p.fechaHoraProgramada!) === dia)
    .filter((p) => !club || String(p.lugarId) === club)
    .filter((p) => !categoria || p.categoriaNombre === categoria)
    .sort((a, b) => a.fechaHoraProgramada!.localeCompare(b.fechaHoraProgramada!)), [partidos, dia, club, categoria])

  const mios = texto.length >= 3 ? (partidos ?? []).filter(juega).sort((a, b) => a.fechaHoraProgramada!.localeCompare(b.fechaHoraProgramada!)) : []

  if (error) return <section className="mx-auto max-w-4xl px-4 py-10"><StatusMessage type="error" title="No se pudieron cargar los horarios" description={error} /></section>
  if (!torneo || !partidos) return <section className="mx-auto max-w-4xl px-4 py-10"><StatusMessage type="loading" title="Cargando horarios..." /></section>

  const filaPartido = (p: PartidoResponse, resaltar: boolean) => {
    const enlaceMapa = mapa(p.lugarNombre, p.lugarId ? direcciones.get(p.lugarId) : null)
    return (
      <article key={p.id} className={`grid grid-cols-[3.5rem_1fr] gap-3 rounded-lg border p-3 ${resaltar ? 'border-rp-accent bg-rp-accent/10' : 'border-rp-border bg-rp-surface/82'}`}>
        <div>
          <p className="text-lg font-black leading-5 text-rp-text">{horaDe(p.fechaHoraProgramada!)}</p>
          {p.estado === 'EN_CURSO' && <p className="mt-1 text-[10px] font-black uppercase text-rp-danger">En juego</p>}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-rp-muted">{[p.categoriaNombre, instanciaPartido(p)].filter(Boolean).join(' · ')}</p>
          <p className="mt-0.5 text-sm font-bold text-rp-text">{nombres(p, 'local').join(' / ') || 'A definir'}</p>
          <p className="text-sm font-bold text-rp-text">{nombres(p, 'visitante').join(' / ') || 'A definir'}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-rp-muted">
            <span>{[variosClubes ? p.lugarNombre : null, p.canchaNombre].filter(Boolean).join(' · ') || 'Cancha a confirmar'}</span>
            {variosClubes && enlaceMapa && <a href={enlaceMapa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-bold text-rp-accent"><MapPin size={12} />Cómo llegar</a>}
          </p>
        </div>
      </article>
    )
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <Button variant="subtle" size="sm" asChild><NavLink to={`/torneos/${id}`}><ArrowLeft size={15} />Volver al torneo</NavLink></Button>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-rp-accent">{torneo.nombre}</p>
      <h1 className="mt-1 text-3xl font-black text-rp-text">Horarios</h1>

      <label className="mt-5 flex items-center gap-2 rounded-lg border border-rp-border bg-rp-surface px-3">
        <Search size={18} className="shrink-0 text-rp-muted" />
        <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="¿Cuándo juego? Escribí tu nombre o apellido"
          className="h-12 w-full min-w-0 bg-transparent text-base text-rp-text outline-none" />
      </label>

      {texto.length >= 3 && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-black text-rp-text">{mios.length === 0 ? 'No encontramos partidos con ese nombre.' : mios.length === 1 ? 'Tu partido' : 'Tus partidos'}</p>
          <div className="flex flex-col gap-2">
            {mios.map((p) => (
              <div key={p.id}>
                <p className="mb-1 text-[11px] font-black uppercase tracking-[0.12em] text-rp-accent">{etiquetaDia(diaDe(p.fechaHoraProgramada!))}</p>
                {filaPartido(p, true)}
              </div>
            ))}
          </div>
        </div>
      )}

      {partidos.length === 0 ? (
        <div className="mt-6"><StatusMessage type="empty" title="Todavía no hay horarios" description="Cuando el organizador los publique, van a aparecer acá." /></div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            <select value={dia} onChange={(e) => setDia(e.target.value)} className="h-10 rounded-md border border-rp-border bg-rp-surface px-3 text-sm text-rp-text">
              <option value="">Todos los días</option>
              {dias.map((d) => <option key={d} value={d}>{etiquetaDia(d)}</option>)}
            </select>
            {variosClubes && (
              <select value={club} onChange={(e) => setClub(e.target.value)} className="h-10 rounded-md border border-rp-border bg-rp-surface px-3 text-sm text-rp-text">
                <option value="">Todos los clubes</option>
                {torneo.sedes!.map((s) => <option key={s.lugarId} value={s.lugarId}>{s.nombre}</option>)}
              </select>
            )}
            {categorias.length > 1 && (
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="h-10 rounded-md border border-rp-border bg-rp-surface px-3 text-sm text-rp-text">
                <option value="">Todas las categorías</option>
                {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>

          {(dia ? [dia] : dias).map((d) => {
            const delDia = visibles.filter((p) => diaDe(p.fechaHoraProgramada!) === d)
            if (delDia.length === 0) return null
            return (
              <div key={d} className="mt-6">
                <h2 className="mb-2 text-sm font-black uppercase tracking-[0.14em] text-rp-accent">{etiquetaDia(d)}</h2>
                <div className="grid gap-2 sm:grid-cols-2">{delDia.map((p) => filaPartido(p, juega(p)))}</div>
              </div>
            )
          })}
        </>
      )}

      {variosClubes && (
        <div className="mt-8 rounded-lg border border-rp-border bg-rp-surface/82 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-rp-muted">Dónde se juega</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {torneo.sedes!.map((s) => {
              const enlace = mapa(s.nombre, s.direccion)
              return (
                <li key={s.lugarId} className="flex flex-wrap items-center gap-2">
                  <b className="text-rp-text">{s.nombre}</b>
                  {s.direccion && <span className="text-rp-muted">{s.direccion}</span>}
                  {enlace && <a href={enlace} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-xs font-bold text-rp-accent"><MapPin size={12} />Cómo llegar</a>}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
