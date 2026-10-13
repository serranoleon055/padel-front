import { Banknote, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { esOrganizador } from '@/config/modo'
import { authApi } from '@/features/auth/authApi'
import { MEDIOS } from '@/features/caja/cajaApi'
import { canchasApi, placesApi } from '@/features/catalog/catalogApi'
import { sedesApi } from '@/features/tournaments/sedesApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { fechaISO, formatearFecha, formatearMoneda } from '@/shared/lib/formatters'
import type { CanchaResponse, FranjaSede, LugarResponse, PagoSedeRequest, TorneoSedeResponse } from '@/shared/types/api'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Select } from '@/shared/ui/Select'
import { StatusMessage } from '@/shared/ui/StatusMessage'
import { useToast } from '@/shared/ui/Toast'

type Formulario = {
  sedeId: number | null
  lugarId: number | null
  canchaIds: number[]
  franjas: FranjaSede[]
  montoAcordado: string
  notas: string
}

const hhmm = (hora: string) => hora.slice(0, 5)

/**
 * Dónde se juega el torneo. Para un organizador es el corazón de la logística: en qué
 * clubes, con qué canchas, qué días y horarios las cede cada uno, y cuánto se le debe.
 * En un club el torneo se juega en su sede y la plata no aparece.
 */
export function SedesTab({ torneoId, fechaInicio }: { torneoId: number; fechaInicio: string | null }) {
  const { success: avisoExito } = useToast()
  const esDuenio = authApi.esDuenio()
  const conPlata = esOrganizador && esDuenio

  const [sedes, setSedes] = useState<TorneoSedeResponse[] | null>(null)
  const [lugares, setLugares] = useState<LugarResponse[]>([])
  const [error, setError] = useState<string | null>(null)

  const [formulario, setFormulario] = useState<Formulario | null>(null)
  const [canchasDelLugar, setCanchasDelLugar] = useState<CanchaResponse[]>([])
  const [guardando, setGuardando] = useState(false)
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null)

  const [pagoPara, setPagoPara] = useState<TorneoSedeResponse | null>(null)
  const [pago, setPago] = useState<PagoSedeRequest | null>(null)
  const [errorPago, setErrorPago] = useState<string | null>(null)

  const [aQuitar, setAQuitar] = useState<TorneoSedeResponse | null>(null)
  const [aAnular, setAAnular] = useState<{ sede: TorneoSedeResponse; pagoId: number } | null>(null)

  const cargar = useCallback(() => {
    sedesApi.listar(torneoId).then(setSedes).catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
  }, [torneoId])

  useEffect(() => { cargar() }, [cargar])
  useEffect(() => { placesApi.getAll().then(setLugares).catch(() => setLugares([])) }, [])

  useEffect(() => {
    if (!formulario?.lugarId) { setCanchasDelLugar([]); return }
    canchasApi.getAll(formulario.lugarId).then((lista) => setCanchasDelLugar(lista.filter((c) => c.activo))).catch(() => setCanchasDelLugar([]))
  }, [formulario?.lugarId])

  function abrirNueva() {
    setErrorFormulario(null)
    setFormulario({ sedeId: null, lugarId: null, canchaIds: [], franjas: [], montoAcordado: '', notas: '' })
  }

  function abrirEdicion(sede: TorneoSedeResponse) {
    setErrorFormulario(null)
    setFormulario({
      sedeId: sede.id,
      lugarId: sede.lugarId,
      canchaIds: sede.canchas.map((c) => c.id),
      franjas: sede.franjas.map((f) => ({ ...f, horaDesde: hhmm(f.horaDesde), horaHasta: hhmm(f.horaHasta) })),
      montoAcordado: sede.montoAcordado != null ? String(sede.montoAcordado) : '',
      notas: sede.notas ?? '',
    })
  }

  async function guardar() {
    if (!formulario?.lugarId) { setErrorFormulario('Elegí el club.'); return }
    setGuardando(true); setErrorFormulario(null)
    const body = {
      lugarId: formulario.lugarId,
      canchaIds: formulario.canchaIds,
      franjas: formulario.franjas,
      // El colaborador no ve la plata: si no la manda, se conserva la que ya estaba.
      montoAcordado: conPlata
        ? (formulario.montoAcordado ? Number(formulario.montoAcordado) : null)
        : (sedes?.find((s) => s.id === formulario.sedeId)?.montoAcordado ?? null),
      notas: formulario.notas || null,
    }
    try {
      if (formulario.sedeId) await sedesApi.actualizar(torneoId, formulario.sedeId, body)
      else await sedesApi.agregar(torneoId, body)
      avisoExito(formulario.sedeId ? 'Club actualizado' : 'Club agregado al torneo')
      setFormulario(null)
      cargar()
    } catch (e: unknown) {
      setErrorFormulario(obtenerMensajeErrorApi(e))
    } finally {
      setGuardando(false)
    }
  }

  async function quitar() {
    if (!aQuitar) return
    try {
      await sedesApi.quitar(torneoId, aQuitar.id)
      avisoExito('Club quitado del torneo')
      cargar()
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    } finally {
      setAQuitar(null)
    }
  }

  function abrirPago(sede: TorneoSedeResponse) {
    setErrorPago(null)
    setPagoPara(sede)
    setPago({ fecha: fechaISO(), monto: sede.saldo ?? 0, medio: 'TRANSFERENCIA', notas: null })
  }

  async function registrarPago() {
    if (!pagoPara || !pago) return
    setGuardando(true); setErrorPago(null)
    try {
      await sedesApi.pagar(torneoId, pagoPara.id, pago)
      avisoExito('Pago registrado')
      setPagoPara(null)
      cargar()
    } catch (e: unknown) {
      setErrorPago(obtenerMensajeErrorApi(e))
    } finally {
      setGuardando(false)
    }
  }

  async function anularPago(motivo: string) {
    if (!aAnular) return
    try {
      await sedesApi.anularPago(torneoId, aAnular.sede.id, aAnular.pagoId, motivo)
      avisoExito('Pago anulado')
      cargar()
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    } finally {
      setAAnular(null)
    }
  }

  function actualizarFranja(indice: number, cambios: Partial<FranjaSede>) {
    setFormulario((f) => f && { ...f, franjas: f.franjas.map((franja, i) => (i === indice ? { ...franja, ...cambios } : franja)) })
  }

  function agregarFranja() {
    setFormulario((f) => {
      if (!f) return f
      const ultima = f.franjas[f.franjas.length - 1]
      return { ...f, franjas: [...f.franjas, ultima ? { ...ultima } : { fecha: fechaInicio ?? fechaISO(), horaDesde: '09:00', horaHasta: '23:00' }] }
    })
  }

  if (error && !sedes) return <StatusMessage type="error" title="No se pudieron cargar los clubes" description={error} />
  if (!sedes) return <StatusMessage type="loading" title="Cargando clubes..." />

  const lugaresDisponibles = lugares.filter((l) => !l.archivado && !sedes.some((s) => s.lugarId === l.id))
  const totalAcordado = sedes.reduce((suma, s) => suma + (s.montoAcordado ?? 0), 0)
  const totalSaldo = sedes.reduce((suma, s) => suma + (s.saldo ?? 0), 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-rp-muted">
          {esOrganizador
            ? 'Los clubes donde se juega, qué canchas cede cada uno y en qué horarios. El fixture solo usa estas canchas y franjas.'
            : 'Las canchas y horarios que se usan para el torneo.'}
        </p>
        {lugaresDisponibles.length > 0 && <Button size="sm" onClick={abrirNueva}><Plus size={15} />{esOrganizador ? 'Agregar club' : 'Agregar sede'}</Button>}
      </div>

      {error && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{error}</p>}

      {conPlata && sedes.some((s) => s.montoAcordado != null) && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Dato titulo="Acordado con los clubes" valor={formatearMoneda(totalAcordado)} />
          <Dato titulo="Ya pagado" valor={formatearMoneda(totalAcordado - totalSaldo)} />
          <Dato titulo="Falta pagar" valor={formatearMoneda(totalSaldo)} destacado={totalSaldo > 0} />
        </div>
      )}

      {sedes.length === 0 && <StatusMessage type="empty" title="Todavía no hay clubes" description="Agregá los clubes donde se juega el torneo." />}

      <div className="grid gap-3 lg:grid-cols-2">
        {sedes.map((sede) => (
          <article key={sede.id} className="flex flex-col gap-3 rounded-xl border border-rp-border bg-rp-surface/82 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="flex items-center gap-2 text-base font-black text-rp-text">
                  <MapPin size={16} className="text-rp-accent" />{sede.lugarNombre}
                  {sede.principal && <span className="rounded-full bg-rp-accent/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-rp-accent">Principal</span>}
                </p>
                {sede.lugarDireccion && <p className="text-xs text-rp-muted">{sede.lugarDireccion}</p>}
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => abrirEdicion(sede)} className="flex size-11 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent lg:size-8" aria-label="Editar"><Pencil size={15} /></button>
                {!sede.principal && <button type="button" onClick={() => setAQuitar(sede)} className="flex size-11 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger lg:size-8" aria-label="Quitar"><Trash2 size={15} /></button>}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-rp-muted">Canchas</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {sede.canchas.map((c) => <span key={c.id} className="rounded-md bg-rp-bg/70 px-2 py-0.5 text-xs font-bold text-rp-text">{c.nombre}</span>)}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-rp-muted">Días y horarios</p>
              {sede.franjas.length === 0
                ? <p className="mt-1 text-xs text-rp-danger">Sin horarios cargados: el fixture no va a poder usar este club.</p>
                : (
                  <ul className="mt-1 flex flex-col gap-0.5 text-sm text-rp-text">
                    {sede.franjas.map((f, i) => <li key={i}>{formatearFecha(f.fecha)} · {hhmm(f.horaDesde)} a {hhmm(f.horaHasta)}</li>)}
                  </ul>
                )}
            </div>

            {sede.notas && <p className="text-xs italic text-rp-muted">{sede.notas}</p>}

            {conPlata && (
              <div className="rounded-lg border border-rp-border bg-rp-bg/45 p-3">
                {sede.montoAcordado == null ? (
                  <p className="text-xs text-rp-muted">Sin monto acordado. Cargalo desde el lápiz para llevar la cuenta con el club.</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-rp-muted">Acordado {formatearMoneda(sede.montoAcordado)}</span>
                      <span className={`font-black ${sede.saldo && sede.saldo > 0 ? 'text-rp-danger' : 'text-rp-accent'}`}>
                        {sede.saldo && sede.saldo > 0 ? `Debés ${formatearMoneda(sede.saldo)}` : 'Pagado'}
                      </span>
                    </div>
                    {(sede.pagos ?? []).length > 0 && (
                      <ul className="mt-2 flex flex-col gap-1 border-t border-rp-border pt-2 text-xs">
                        {(sede.pagos ?? []).map((p) => (
                          <li key={p.id} className={`flex items-center justify-between gap-2 ${p.anulado ? 'text-rp-muted line-through' : 'text-rp-text'}`}>
                            <span>{formatearFecha(p.fecha)} · {MEDIOS.find((m) => m.valor === p.medio)?.nombre ?? p.medio}{p.notas ? ` · ${p.notas}` : ''}</span>
                            <span className="flex items-center gap-1 font-bold">
                              {formatearMoneda(p.monto)}
                              {!p.anulado && <button type="button" onClick={() => setAAnular({ sede, pagoId: p.id })} className="flex size-7 items-center justify-center rounded text-rp-muted hover:text-rp-danger" aria-label="Anular pago"><X size={13} /></button>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {sede.saldo != null && sede.saldo > 0 && (
                      <Button size="sm" variant="subtle" className="mt-2" onClick={() => abrirPago(sede)}><Banknote size={15} />Registrar pago</Button>
                    )}
                  </>
                )}
              </div>
            )}
          </article>
        ))}
      </div>

      <Modal isOpen={Boolean(formulario)} onClose={() => setFormulario(null)} onSubmit={guardar} title={formulario?.sedeId ? 'Editar club del torneo' : 'Agregar club al torneo'} size="lg">
        {formulario && (
          <div className="flex flex-col gap-4">
            {errorFormulario && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorFormulario}</p>}

            {formulario.sedeId == null ? (
              <Select label="Club" value={formulario.lugarId?.toString() ?? ''} placeholder="Elegí un club..." onChange={(e) => setFormulario({ ...formulario, lugarId: Number(e.target.value) || null, canchaIds: [] })}>
                {lugaresDisponibles.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </Select>
            ) : (
              <p className="text-base font-black text-rp-text">{sedes.find((s) => s.id === formulario.sedeId)?.lugarNombre}</p>
            )}

            {formulario.lugarId && (
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-rp-muted">Canchas que cede</p>
                {canchasDelLugar.length === 0
                  ? <p className="mt-1 text-xs text-rp-danger">Este club no tiene canchas cargadas. Cargalas en Clubes y canchas.</p>
                  : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {canchasDelLugar.map((c) => {
                        const marcada = formulario.canchaIds.length === 0 || formulario.canchaIds.includes(c.id)
                        return (
                          <label key={c.id} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold ${marcada ? 'border-rp-accent bg-rp-accent/10 text-rp-text' : 'border-rp-border text-rp-muted'}`}>
                            <input
                              type="checkbox"
                              className="size-4 accent-rp-accent"
                              checked={marcada}
                              onChange={() => {
                                const actuales = formulario.canchaIds.length === 0 ? canchasDelLugar.map((x) => x.id) : formulario.canchaIds
                                const siguientes = actuales.includes(c.id) ? actuales.filter((id) => id !== c.id) : [...actuales, c.id]
                                setFormulario({ ...formulario, canchaIds: siguientes })
                              }}
                            />
                            {c.nombre}
                          </label>
                        )
                      })}
                    </div>
                  )}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-rp-muted">Días y horarios que cede</p>
                <Button size="sm" variant="ghost" onClick={agregarFranja}><Plus size={14} />Agregar día</Button>
              </div>
              {formulario.franjas.length === 0 && <p className="mt-1 text-xs text-rp-muted">Ej: sábado 7 de 14 a 23 y domingo 8 de 9 a 20.</p>}
              <div className="mt-2 flex flex-col gap-2">
                {formulario.franjas.map((franja, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
                    <div className="col-span-3 sm:col-span-1">
                      <Input id={`franja-dia-${i}`} label="Día" type="date" value={franja.fecha} onChange={(e) => actualizarFranja(i, { fecha: e.target.value })} />
                    </div>
                    <Input id={`franja-desde-${i}`} label="Desde" type="time" value={franja.horaDesde} onChange={(e) => actualizarFranja(i, { horaDesde: e.target.value })} />
                    <Input id={`franja-hasta-${i}`} label="Hasta" type="time" value={franja.horaHasta} onChange={(e) => actualizarFranja(i, { horaHasta: e.target.value })} />
                    <button type="button" onClick={() => setFormulario({ ...formulario, franjas: formulario.franjas.filter((_, j) => j !== i) })} className="mb-0.5 flex size-11 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger" aria-label="Quitar día"><X size={16} /></button>
                  </div>
                ))}
              </div>
            </div>

            {conPlata && (
              <Input label="Monto acordado con el club (por todo el torneo)" type="number" min={0} value={formulario.montoAcordado} onChange={(e) => setFormulario({ ...formulario, montoAcordado: e.target.value })} placeholder="150000" />
            )}
            <Input label="Notas" value={formulario.notas} onChange={(e) => setFormulario({ ...formulario, notas: e.target.value })} placeholder="Contacto del encargado, cómo se paga, etc." />

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setFormulario(null)} disabled={guardando}>Cancelar</Button>
              <Button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={Boolean(pagoPara)} onClose={() => setPagoPara(null)} onSubmit={registrarPago} title={`Pago a ${pagoPara?.lugarNombre ?? ''}`} size="sm">
        {pago && (
          <div className="flex flex-col gap-3">
            {errorPago && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorPago}</p>}
            <p className="text-sm text-rp-muted">Saldo: <b className="text-rp-text">{formatearMoneda(pagoPara?.saldo ?? 0)}</b></p>
            <Input label="Monto" type="number" min={1} value={String(pago.monto)} onChange={(e) => setPago({ ...pago, monto: Number(e.target.value) })} />
            <Input label="Fecha" type="date" value={pago.fecha} onChange={(e) => setPago({ ...pago, fecha: e.target.value })} />
            <Select label="Cómo se pagó" value={pago.medio} onChange={(e) => setPago({ ...pago, medio: e.target.value as PagoSedeRequest['medio'] })}>
              {MEDIOS.map((m) => <option key={m.valor} value={m.valor}>{m.nombre}</option>)}
            </Select>
            <Input label="Notas" value={pago.notas ?? ''} onChange={(e) => setPago({ ...pago, notas: e.target.value || null })} placeholder="Seña, saldo, a quién se le dio..." />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPagoPara(null)} disabled={guardando}>Cancelar</Button>
              <Button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Registrar pago'}</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={Boolean(aQuitar)} onClose={() => setAQuitar(null)} onConfirm={quitar}
        title="Quitar club" description={`¿Quitás ${aQuitar?.lugarNombre ?? ''} del torneo? Sus canchas dejan de usarse para el fixture.`} confirmLabel="Quitar" loadingLabel="Quitando..." />

      <ConfirmDialog isOpen={Boolean(aAnular)} onClose={() => setAAnular(null)} onConfirm={anularPago}
        title="Anular pago" description="El pago queda registrado como anulado y el saldo con el club vuelve a subir." confirmLabel="Anular" loadingLabel="Anulando..." pedirMotivo />
    </div>
  )
}

function Dato({ titulo, valor, destacado = false }: { titulo: string; valor: string; destacado?: boolean }) {
  return (
    <div className="rounded-lg border border-rp-border bg-rp-surface/82 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-rp-muted">{titulo}</p>
      <p className={`mt-1 text-lg font-black ${destacado ? 'text-rp-danger' : 'text-rp-text'}`}>{valor}</p>
    </div>
  )
}
