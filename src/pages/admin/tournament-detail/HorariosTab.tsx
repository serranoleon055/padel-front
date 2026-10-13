import { AlertTriangle, CalendarClock, Settings2, Trash2, Wand2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { esOrganizador } from '@/config/modo'
import { fixtureApi } from '@/features/tournaments/fixtureApi'
import { sedesApi } from '@/features/tournaments/sedesApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { aInputFechaHora, diaDe, etiquetaDia, horaDe } from '@/shared/lib/fixture'
import type { FixtureResponse, PartidoFixture, PropuestaFixture, ReglasFixture, TorneoSedeResponse } from '@/shared/types/api'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Select } from '@/shared/ui/Select'
import { StatusMessage } from '@/shared/ui/StatusMessage'
import { useToast } from '@/shared/ui/Toast'

type Cancha = { id: number; nombre: string; lugarId: number; lugarNombre: string }

/**
 * Los horarios del torneo. El sistema propone dónde y cuándo va cada partido respetando
 * las canchas que cede cada club, cuándo no puede cada pareja y el descanso; el
 * organizador revisa, aplica y después mueve a mano lo que quiera, con los choques a la vista.
 */
export function HorariosTab({ torneoId, accionesPartido }: {
  torneoId: number
  /** Botones extra por partido (los avisos por WhatsApp). */
  accionesPartido?: (partido: PartidoFixture) => React.ReactNode
}) {
  const { success: avisoExito } = useToast()
  const [fixture, setFixture] = useState<FixtureResponse | null>(null)
  const [sedes, setSedes] = useState<TorneoSedeResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [dia, setDia] = useState<string | null>(null)
  const [club, setClub] = useState('')

  const [armando, setArmando] = useState<{ desde: string; reprogramar: boolean; categoriaId: string } | null>(null)
  const [propuesta, setPropuesta] = useState<PropuestaFixture | null>(null)
  const [reglas, setReglas] = useState<ReglasFixture | null>(null)
  const [moviendo, setMoviendo] = useState<{ partido: PartidoFixture; canchaId: string; inicio: string } | null>(null)
  const [trabajando, setTrabajando] = useState(false)
  const [errorModal, setErrorModal] = useState<string | null>(null)

  const cargar = useCallback(() => {
    fixtureApi.agenda(torneoId).then(setFixture).catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
    sedesApi.listar(torneoId).then(setSedes).catch(() => setSedes([]))
  }, [torneoId])

  useEffect(() => { cargar() }, [cargar])

  const canchas = useMemo<Cancha[]>(
    () => sedes.flatMap((s) => s.canchas.map((c) => ({ id: c.id, nombre: c.nombre, lugarId: s.lugarId, lugarNombre: s.lugarNombre }))),
    [sedes],
  )
  const programados = useMemo(() => (fixture?.partidos ?? []).filter((p) => p.inicio), [fixture])
  const sinHorario = useMemo(() => (fixture?.partidos ?? []).filter((p) => !p.inicio && p.programable), [fixture])
  const dias = useMemo(() => [...new Set(programados.map((p) => diaDe(p.inicio!)))].sort(), [programados])
  const diaActivo = dia && dias.includes(dia) ? dia : dias[0] ?? null
  const conflictoPorPartido = useMemo(() => {
    const mapa = new Map<number, boolean>()
    for (const c of fixture?.conflictos ?? []) c.partidoIds.forEach((id) => mapa.set(id, (mapa.get(id) ?? false) || c.grave))
    return mapa
  }, [fixture])
  const categorias = useMemo(
    () => [...new Map((fixture?.partidos ?? []).filter((p) => p.categoriaId).map((p) => [p.categoriaId!, p.categoriaNombre ?? ''])).entries()],
    [fixture],
  )

  // Columnas del día: las canchas de los clubes del torneo, más cualquier otra en que haya un partido.
  const columnas = useMemo(() => {
    const delDia = programados.filter((p) => diaActivo && diaDe(p.inicio!) === diaActivo)
    const lista: Cancha[] = [...canchas]
    for (const p of delDia) {
      if (p.canchaId && !lista.some((c) => c.id === p.canchaId)) {
        lista.push({ id: p.canchaId, nombre: p.canchaNombre ?? 'Cancha', lugarId: p.lugarId ?? 0, lugarNombre: p.lugarNombre ?? '' })
      }
    }
    return lista
      .filter((c) => !club || String(c.lugarId) === club)
      .map((c) => ({ cancha: c, partidos: delDia.filter((p) => p.canchaId === c.id).sort((a, b) => a.inicio!.localeCompare(b.inicio!)) }))
      .filter((col) => col.partidos.length > 0 || canchas.some((c) => c.id === col.cancha.id))
  }, [programados, canchas, diaActivo, club])

  async function proponer() {
    if (!armando) return
    setTrabajando(true); setErrorModal(null)
    try {
      setPropuesta(await fixtureApi.proponer(torneoId, {
        desde: armando.desde ? `${armando.desde}:00` : null,
        reprogramar: armando.reprogramar,
        categoriaId: armando.categoriaId ? Number(armando.categoriaId) : null,
      }))
    } catch (e: unknown) {
      setErrorModal(obtenerMensajeErrorApi(e))
    } finally {
      setTrabajando(false)
    }
  }

  async function aplicar() {
    if (!propuesta) return
    setTrabajando(true); setErrorModal(null)
    try {
      setFixture(await fixtureApi.aplicar(torneoId, propuesta.asignaciones.map((a) => ({ partidoId: a.partidoId, canchaId: a.canchaId, inicio: a.inicio }))))
      avisoExito(propuesta.asignaciones.length === 1 ? '1 partido programado' : `${propuesta.asignaciones.length} partidos programados`)
      setPropuesta(null); setArmando(null)
    } catch (e: unknown) {
      setErrorModal(obtenerMensajeErrorApi(e))
    } finally {
      setTrabajando(false)
    }
  }

  async function abrirReglas() {
    setErrorModal(null)
    try {
      setReglas(await fixtureApi.reglas(torneoId))
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    }
  }

  async function guardarReglas() {
    if (!reglas) return
    setTrabajando(true); setErrorModal(null)
    try {
      await fixtureApi.guardarReglas(torneoId, reglas)
      avisoExito('Reglas guardadas')
      setReglas(null)
      cargar()
    } catch (e: unknown) {
      setErrorModal(obtenerMensajeErrorApi(e))
    } finally {
      setTrabajando(false)
    }
  }

  function abrirMover(partido: PartidoFixture) {
    setErrorModal(null)
    setMoviendo({ partido, canchaId: partido.canchaId ? String(partido.canchaId) : String(canchas[0]?.id ?? ''), inicio: aInputFechaHora(partido.inicio) })
  }

  async function mover() {
    if (!moviendo) return
    if (!moviendo.canchaId || !moviendo.inicio) { setErrorModal('Elegí la cancha y el horario.'); return }
    setTrabajando(true); setErrorModal(null)
    try {
      setFixture(await fixtureApi.mover(torneoId, moviendo.partido.id, { canchaId: Number(moviendo.canchaId), inicio: `${moviendo.inicio}:00` }))
      avisoExito('Partido movido')
      setDia(diaDe(moviendo.inicio))
      setMoviendo(null)
    } catch (e: unknown) {
      setErrorModal(obtenerMensajeErrorApi(e))
    } finally {
      setTrabajando(false)
    }
  }

  async function desprogramar(partido: PartidoFixture) {
    try {
      setFixture(await fixtureApi.desprogramar(torneoId, partido.id))
      avisoExito('Se le sacó el horario')
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    }
  }

  if (error && !fixture) return <StatusMessage type="error" title="No se pudieron cargar los horarios" description={error} />
  if (!fixture) return <StatusMessage type="loading" title="Cargando horarios..." />

  const graves = fixture.conflictos.filter((c) => c.grave)
  const avisos = fixture.conflictos.filter((c) => !c.grave)
  const diasPropuesta = propuesta ? [...new Set(propuesta.asignaciones.map((a) => diaDe(a.inicio)))].sort() : []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-rp-muted">
          {fixture.sinProgramar > 0
            ? <><b className="text-rp-text">{fixture.sinProgramar}</b> {fixture.sinProgramar === 1 ? 'partido listo para jugar no tiene' : 'partidos listos para jugar no tienen'} horario.</>
            : programados.length > 0 ? 'Todos los partidos definidos tienen horario.' : 'Todavía no hay partidos con horario.'}
          {' '}Descanso mínimo: {fixture.descansoMinimoMinutos} min.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={abrirReglas}><Settings2 size={15} />Reglas</Button>
          <Button size="sm" onClick={() => { setErrorModal(null); setPropuesta(null); setArmando({ desde: '', reprogramar: false, categoriaId: '' }) }}>
            <Wand2 size={15} />Armar horarios
          </Button>
        </div>
      </div>

      {error && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{error}</p>}

      {fixture.conflictos.length > 0 && (
        <div className={`rounded-lg border p-3 ${graves.length > 0 ? 'border-rp-danger/50 bg-rp-danger/5' : 'border-rp-amber/50 bg-rp-amber/5'}`}>
          <p className="flex items-center gap-2 text-sm font-black text-rp-text">
            <AlertTriangle size={16} className={graves.length > 0 ? 'text-rp-danger' : 'text-rp-amber'} />
            {graves.length > 0 ? `${graves.length} ${graves.length === 1 ? 'choque' : 'choques'} para resolver` : ''}
            {graves.length > 0 && avisos.length > 0 ? ' · ' : ''}
            {avisos.length > 0 ? `${avisos.length} ${avisos.length === 1 ? 'aviso' : 'avisos'}` : ''}
          </p>
          <ul className="mt-2 flex max-h-56 flex-col gap-1 overflow-y-auto text-xs">
            {fixture.conflictos.map((c, i) => (
              <li key={i} className={c.grave ? 'font-bold text-rp-danger' : 'text-rp-text'}>• {c.mensaje}</li>
            ))}
          </ul>
        </div>
      )}

      {dias.length > 0 && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-1 rounded-lg border border-rp-border bg-rp-surface/82 p-1">
            {dias.map((d) => (
              <button key={d} type="button" onClick={() => setDia(d)} className={`rounded-md px-3 py-1.5 text-sm font-bold ${d === diaActivo ? 'bg-rp-surface-2 text-rp-accent' : 'text-rp-muted hover:text-rp-text'}`}>
                {etiquetaDia(d)}
              </button>
            ))}
          </div>
          {esOrganizador && sedes.length > 1 && (
            <div className="w-56">
              <Select label="Club" value={club} onChange={(e) => setClub(e.target.value)}>
                <option value="">Todos</option>
                {sedes.map((s) => <option key={s.lugarId} value={s.lugarId}>{s.lugarNombre}</option>)}
              </Select>
            </div>
          )}
        </div>
      )}

      {diaActivo && (
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-3">
            {columnas.map(({ cancha, partidos }) => (
              <div key={cancha.id} className="w-60 shrink-0">
                <p className="mb-2 text-xs font-black text-rp-text">
                  {cancha.nombre}
                  {esOrganizador && <span className="block text-[10px] font-bold uppercase tracking-wide text-rp-muted">{cancha.lugarNombre}</span>}
                </p>
                <div className="flex flex-col gap-2">
                  {partidos.length === 0 && <p className="rounded-md border border-dashed border-rp-border px-2 py-3 text-center text-xs text-rp-muted">Libre</p>}
                  {partidos.map((p) => (
                    <TarjetaHorario key={p.id} partido={p} conflicto={conflictoPorPartido.get(p.id)}
                      onMover={() => abrirMover(p)} onSacar={() => desprogramar(p)} extra={accionesPartido?.(p)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sinHorario.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-rp-muted">Sin horario</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {sinHorario.map((p) => (
              <article key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-rp-border bg-rp-surface/82 p-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wide text-rp-muted">{p.categoriaNombre} · {p.etapa}</p>
                  <p className="truncate text-sm font-bold text-rp-text">{p.local} vs {p.visitante}</p>
                </div>
                <Button size="sm" variant="subtle" onClick={() => abrirMover(p)}><CalendarClock size={14} />Programar</Button>
              </article>
            ))}
          </div>
        </div>
      )}

      {fixture.partidos.length === 0 && (
        <StatusMessage type="empty" title="Todavía no hay partidos" description="Los partidos aparecen al hacer el sorteo. Antes, cargá en Clubes los días y horarios de cada club." />
      )}

      <Modal isOpen={Boolean(armando)} onClose={() => { setArmando(null); setPropuesta(null) }} onSubmit={propuesta ? aplicar : proponer}
        title={propuesta ? 'Propuesta de horarios' : 'Armar horarios'} size="lg">
        {armando && (
          <div className="flex flex-col gap-4">
            {errorModal && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorModal}</p>}
            {!propuesta ? (
              <>
                <p className="text-sm text-rp-muted">
                  Se ubican los partidos que tienen las dos parejas definidas, dentro de los días y horarios que cede cada club,
                  respetando cuándo no puede cada pareja, el descanso mínimo y que nadie juegue dos partidos a la vez.
                  Lo que ya tiene horario se respeta. No se guarda nada hasta que lo apliques.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Desde (opcional)" type="datetime-local" value={armando.desde} onChange={(e) => setArmando({ ...armando, desde: e.target.value })} />
                  <Select label="Categoría" value={armando.categoriaId} onChange={(e) => setArmando({ ...armando, categoriaId: e.target.value })}>
                    <option value="">Todas</option>
                    {categorias.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
                  </Select>
                </div>
                <label className="flex cursor-pointer items-start gap-2 text-sm font-bold text-rp-muted">
                  <input type="checkbox" className="mt-0.5 size-4 accent-rp-accent" checked={armando.reprogramar} onChange={(e) => setArmando({ ...armando, reprogramar: e.target.checked })} />
                  <span>Volver a armar los que ya tienen horario<span className="block text-xs font-normal">Solo los que no empezaron y son desde la fecha elegida. Ojo: si ya avisaste a los jugadores, cambian.</span></span>
                </label>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setArmando(null)} disabled={trabajando}>Cancelar</Button>
                  <Button type="submit" disabled={trabajando}>{trabajando ? 'Armando...' : 'Ver propuesta'}</Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-rp-muted">
                  <b className="text-rp-text">{propuesta.asignaciones.length}</b> {propuesta.asignaciones.length === 1 ? 'partido ubicado' : 'partidos ubicados'}
                  {propuesta.respetados > 0 ? ` · se ${propuesta.respetados === 1 ? 'respetó 1 que ya tenía' : `respetaron ${propuesta.respetados} que ya tenían`} horario` : ''}.
                </p>
                {propuesta.sinLugar.length > 0 && (
                  <div className="rounded-md border border-rp-danger/40 bg-rp-danger/5 p-3 text-xs">
                    <p className="font-black text-rp-danger">{propuesta.sinLugar.length} no {propuesta.sinLugar.length === 1 ? 'entró' : 'entraron'}:</p>
                    <ul className="mt-1 flex flex-col gap-1 text-rp-text">
                      {propuesta.sinLugar.map((s) => <li key={s.partidoId}><b>{s.descripcion}</b>: {s.motivo}</li>)}
                    </ul>
                  </div>
                )}
                <div className="max-h-[50vh] overflow-y-auto">
                  {diasPropuesta.map((d) => (
                    <div key={d} className="mb-3">
                      <p className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-rp-accent">{etiquetaDia(d)}</p>
                      <table className="w-full text-left text-xs">
                        <tbody>
                          {propuesta.asignaciones.filter((a) => diaDe(a.inicio) === d).map((a) => (
                            <tr key={a.partidoId} className="border-t border-rp-border">
                              <td className="py-1.5 pr-2 font-black text-rp-text">{horaDe(a.inicio)}</td>
                              <td className="py-1.5 pr-2 text-rp-muted">{esOrganizador ? `${a.lugarNombre} · ` : ''}{a.canchaNombre}</td>
                              <td className="py-1.5 text-rp-text">{a.descripcion}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setPropuesta(null)} disabled={trabajando}>Volver</Button>
                  <Button type="submit" disabled={trabajando || propuesta.asignaciones.length === 0}>{trabajando ? 'Aplicando...' : propuesta.asignaciones.length === 1 ? 'Aplicar 1 horario' : `Aplicar ${propuesta.asignaciones.length} horarios`}</Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={Boolean(reglas)} onClose={() => setReglas(null)} onSubmit={guardarReglas} title="Reglas para armar los horarios" size="lg">
        {reglas && (
          <div className="flex flex-col gap-4">
            {errorModal && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorModal}</p>}
            <Input label="Descanso mínimo entre partidos de una pareja (minutos)" type="number" min={0} value={String(reglas.descansoMinimoMinutos)}
              onChange={(e) => setReglas({ ...reglas, descansoMinimoMinutos: Number(e.target.value) })} />
            <div className="flex flex-col gap-3">
              {reglas.categorias.map((c, i) => (
                <div key={c.categoriaId} className="rounded-md border border-rp-border p-3">
                  <p className="text-sm font-black text-rp-text">{c.categoriaNombre}</p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <Input id={`duracion-${c.categoriaId}`} label="Turno por partido (min)" type="number" min={15} value={c.duracionPartidoMinutos ?? ''}
                      placeholder={`Sugerido: ${c.duracionSugerida ?? ''}`}
                      onChange={(e) => setReglas({ ...reglas, categorias: reglas.categorias.map((x, j) => (j === i ? { ...x, duracionPartidoMinutos: e.target.value ? Number(e.target.value) : null } : x)) })} />
                    {esOrganizador && (
                      <Select id={`club-${c.categoriaId}`} label="Se juega en" value={c.lugarFijoId?.toString() ?? ''}
                        onChange={(e) => setReglas({ ...reglas, categorias: reglas.categorias.map((x, j) => (j === i ? { ...x, lugarFijoId: e.target.value ? Number(e.target.value) : null } : x)) })}>
                        <option value="">Cualquier club del torneo</option>
                        {sedes.map((s) => <option key={s.lugarId} value={s.lugarId}>{s.lugarNombre}</option>)}
                      </Select>
                    )}
                  </div>
                  {c.duracionPartidoMinutos == null && <p className="mt-1 text-xs text-rp-muted">Si lo dejás vacío se usa el sugerido según el formato: {c.duracionSugerida}.</p>}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setReglas(null)} disabled={trabajando}>Cancelar</Button>
              <Button type="submit" disabled={trabajando}>{trabajando ? 'Guardando...' : 'Guardar'}</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={Boolean(moviendo)} onClose={() => setMoviendo(null)} onSubmit={mover} title={moviendo?.partido.inicio ? 'Mover partido' : 'Programar partido'} size="sm">
        {moviendo && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-bold text-rp-text">{moviendo.partido.local} vs {moviendo.partido.visitante}</p>
            <p className="-mt-2 text-xs text-rp-muted">{moviendo.partido.categoriaNombre} · {moviendo.partido.etapa} · {moviendo.partido.duracionMinutos} min</p>
            {errorModal && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorModal}</p>}
            <Select label="Cancha" value={moviendo.canchaId} onChange={(e) => setMoviendo({ ...moviendo, canchaId: e.target.value })}>
              {canchas.map((c) => <option key={c.id} value={c.id}>{esOrganizador ? `${c.lugarNombre} · ` : ''}{c.nombre}</option>)}
            </Select>
            <Input label="Día y hora" type="datetime-local" value={moviendo.inicio} onChange={(e) => setMoviendo({ ...moviendo, inicio: e.target.value })} />
            <p className="text-xs text-rp-muted">Si la cancha está ocupada o un jugador ya juega a esa hora, no se guarda. Si choca con una restricción o con el descanso, se guarda y queda como aviso.</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setMoviendo(null)} disabled={trabajando}>Cancelar</Button>
              <Button type="submit" disabled={trabajando}>{trabajando ? 'Guardando...' : 'Guardar'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function TarjetaHorario({ partido, conflicto, onMover, onSacar, extra }: {
  partido: PartidoFixture
  conflicto: boolean | undefined
  onMover: () => void
  onSacar: () => void
  extra?: React.ReactNode
}) {
  const jugado = !partido.programable
  const borde = conflicto === true ? 'border-rp-danger' : conflicto === false ? 'border-rp-amber' : 'border-rp-border'
  return (
    <article className={`rounded-lg border-2 bg-rp-surface/90 p-2.5 ${borde} ${jugado ? 'opacity-70' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-black text-rp-text">{horaDe(partido.inicio!)}–{horaDe(partido.fin!)}</span>
        <span className="truncate text-[10px] font-black uppercase tracking-wide text-rp-muted">{partido.categoriaNombre}</span>
      </div>
      <p className="text-[11px] text-rp-muted">{partido.etapa}</p>
      <p className="mt-1 text-xs font-bold leading-4 text-rp-text">{partido.local}</p>
      <p className="text-xs font-bold leading-4 text-rp-text">{partido.visitante}</p>
      {partido.marcador && <p className="mt-1 text-xs font-black text-rp-accent">{partido.marcador}</p>}
      {partido.estado === 'EN_CURSO' && <p className="mt-1 text-[11px] font-black text-rp-danger">En juego</p>}
      {!jugado && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <button type="button" onClick={onMover} className="rounded-md bg-rp-surface-2 px-2 py-1 text-rp-muted hover:text-rp-accent"><span className="text-[11px] font-bold">Mover</span></button>
          {partido.estado === 'PENDIENTE' && <button type="button" onClick={onSacar} className="flex size-7 items-center justify-center rounded-md text-rp-muted hover:text-rp-danger" aria-label="Sacar horario" title="Sacar horario"><Trash2 size={13} /></button>}
          {extra}
        </div>
      )}
    </article>
  )
}
