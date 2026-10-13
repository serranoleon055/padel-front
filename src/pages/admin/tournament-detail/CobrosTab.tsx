import { Banknote, ChevronDown, ChevronUp, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { brand } from '@/config/brand'
import { authApi } from '@/features/auth/authApi'
import { MEDIOS } from '@/features/caja/cajaApi'
import { cobrosApi } from '@/features/tournaments/cobrosApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { fechaISO, formatearFecha, formatearMoneda } from '@/shared/lib/formatters'
import { enlaceWhatsApp, mensajeDeudaInscripcion } from '@/shared/lib/whatsapp'
import type { CuentaInscripcionesResponse, CuentaJugador, CuentaPareja, PagoJugadorRequest } from '@/shared/types/api'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { SegmentedToggle } from '@/shared/ui/SegmentedToggle'
import { Select } from '@/shared/ui/Select'
import { StatusMessage } from '@/shared/ui/StatusMessage'
import { useToast } from '@/shared/ui/Toast'

type Filtro = 'deben' | 'todos' | 'al-dia'

const FILTROS: { valor: Filtro; label: string }[] = [
  { valor: 'deben', label: 'Deben' },
  { valor: 'todos', label: 'Todos' },
  { valor: 'al-dia', label: 'Al día' },
]

/**
 * Quién pagó la inscripción y quién debe, jugador por jugador. Se cobra en partes y por
 * cualquier medio; la seña online entra sola. Desde acá también se le recuerda la deuda
 * a cada uno por WhatsApp.
 */
export function CobrosTab({ torneoId, torneoNombre }: { torneoId: number; torneoNombre: string }) {
  const { success: avisoExito } = useToast()
  const esDuenio = authApi.esDuenio()

  const [cuenta, setCuenta] = useState<CuentaInscripcionesResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('deben')
  const [categoria, setCategoria] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [abiertos, setAbiertos] = useState<Set<number>>(new Set())

  const [cobrando, setCobrando] = useState<{ pareja: CuentaPareja; jugador: CuentaJugador } | null>(null)
  const [pago, setPago] = useState<PagoJugadorRequest | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [errorPago, setErrorPago] = useState<string | null>(null)
  const [aAnular, setAAnular] = useState<number | null>(null)

  const cargar = useCallback(() => {
    cobrosApi.cuenta(torneoId).then(setCuenta).catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
  }, [torneoId])

  useEffect(() => { cargar() }, [cargar])

  const categorias = useMemo(
    () => [...new Set((cuenta?.parejas ?? []).map((p) => p.categoriaNombre ?? ''))].filter(Boolean),
    [cuenta],
  )

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return (cuenta?.parejas ?? []).filter((p) => {
      if (categoria && p.categoriaNombre !== categoria) return false
      if (filtro === 'deben' && p.saldo <= 0) return false
      if (filtro === 'al-dia' && p.saldo > 0) return false
      return !texto || p.jugadores.some((j) => j.nombre.toLowerCase().includes(texto))
    })
  }, [cuenta, categoria, filtro, busqueda])

  function abrirCobro(pareja: CuentaPareja, jugador: CuentaJugador) {
    setErrorPago(null)
    setCobrando({ pareja, jugador })
    setPago({ jugadorId: jugador.jugadorId, fecha: fechaISO(), monto: jugador.saldo, medio: 'EFECTIVO', notas: null })
  }

  async function cobrar() {
    if (!cobrando || !pago) return
    setGuardando(true); setErrorPago(null)
    try {
      setCuenta(await cobrosApi.cobrar(torneoId, cobrando.pareja.parejaId, pago))
      avisoExito(`Pago de ${cobrando.jugador.nombre} registrado`)
      setCobrando(null)
    } catch (e: unknown) {
      setErrorPago(obtenerMensajeErrorApi(e))
    } finally {
      setGuardando(false)
    }
  }

  async function anular(motivo: string) {
    if (aAnular == null) return
    try {
      setCuenta(await cobrosApi.anular(torneoId, aAnular, motivo))
      avisoExito('Pago anulado')
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    } finally {
      setAAnular(null)
    }
  }

  function alternar(jugadorId: number) {
    setAbiertos((actual) => {
      const siguiente = new Set(actual)
      if (siguiente.has(jugadorId)) siguiente.delete(jugadorId)
      else siguiente.add(jugadorId)
      return siguiente
    })
  }

  if (error && !cuenta) return <StatusMessage type="error" title="No se pudo cargar la cuenta" description={error} />
  if (!cuenta) return <StatusMessage type="loading" title="Cargando cobros..." />

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Dato titulo="A cobrar" valor={formatearMoneda(cuenta.totalEsperado)} />
        <Dato titulo="Cobrado" valor={formatearMoneda(cuenta.totalCobrado)} />
        <Dato titulo="Falta cobrar" valor={formatearMoneda(cuenta.totalPendiente)} destacado={cuenta.totalPendiente > 0} />
        <Dato titulo="Jugadores que deben" valor={`${cuenta.jugadoresConDeuda} de ${cuenta.jugadoresConDeuda + cuenta.jugadoresAlDia}`} destacado={cuenta.jugadoresConDeuda > 0} />
      </div>

      {error && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{error}</p>}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <SegmentedToggle className="lg:w-80 lg:shrink-0" valor={filtro} onChange={setFiltro} opciones={FILTROS} />
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
        <Select label="Categoría" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          <option value="">Todas</option>
          {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Input label="Buscar jugador" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre o apellido" />
        </div>
      </div>

      {visibles.length === 0 && (
        <StatusMessage type="empty" title={filtro === 'deben' ? 'Nadie debe nada' : 'Sin parejas'} description={filtro === 'deben' ? 'Todas las inscripciones de este filtro están pagas.' : undefined} />
      )}

      <div className="flex flex-col gap-2">
        {visibles.map((pareja) => (
          <article key={pareja.parejaId} className="rounded-xl border border-rp-border bg-rp-surface/82 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.12em] text-rp-muted">{pareja.categoriaNombre}{pareja.estado === 'ELIMINADA' ? ' · retirada' : ''}</span>
              {pareja.saldo > 0
                ? <span className="text-xs font-black text-rp-danger">Debe {formatearMoneda(pareja.saldo)}</span>
                : <span className="text-xs font-black text-rp-accent">Pareja al día</span>}
            </div>
            <div className="flex flex-col divide-y divide-rp-border">
              {pareja.jugadores.map((jugador) => {
                const recordatorio = jugador.saldo > 0
                  ? enlaceWhatsApp(jugador.telefono, mensajeDeudaInscripcion({ organizacion: brand.name, jugadorNombre: jugador.nombre, torneoNombre, saldo: jugador.saldo, pagado: jugador.pagado }))
                  : null
                const abierto = abiertos.has(jugador.jugadorId)
                return (
                  <div key={jugador.jugadorId} className="py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button type="button" onClick={() => alternar(jugador.jugadorId)} className="flex min-w-0 items-center gap-1.5 text-left">
                        {jugador.pagos.length > 0 && (abierto ? <ChevronUp size={14} className="shrink-0 text-rp-muted" /> : <ChevronDown size={14} className="shrink-0 text-rp-muted" />)}
                        <span className="truncate text-sm font-bold text-rp-text">{jugador.nombre}</span>
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-rp-muted">{formatearMoneda(jugador.pagado)} de {formatearMoneda(jugador.costo)}</span>
                        {jugador.saldo > 0 ? (
                          <>
                            {recordatorio && <a href={recordatorio} target="_blank" rel="noreferrer" className="rounded-md border border-rp-border px-2 py-1 text-xs font-bold text-rp-muted hover:text-rp-accent">Recordar</a>}
                            <Button size="sm" variant="subtle" onClick={() => abrirCobro(pareja, jugador)}><Banknote size={14} />Cobrar</Button>
                          </>
                        ) : (
                          <span className="rounded-full bg-rp-accent/15 px-2 py-0.5 text-[11px] font-black text-rp-accent">Pagó</span>
                        )}
                      </div>
                    </div>
                    {abierto && jugador.pagos.length > 0 && (
                      <ul className="mt-2 flex flex-col gap-1 pl-5 text-xs">
                        {jugador.pagos.map((p) => (
                          <li key={p.id} className={`flex items-center justify-between gap-2 ${p.anulado ? 'text-rp-muted line-through' : 'text-rp-text'}`}>
                            <span>{formatearFecha(p.fecha)} · {MEDIOS.find((m) => m.valor === p.medio)?.nombre ?? p.medio}{p.notas ? ` · ${p.notas}` : ''}{p.registradoPor && !p.online ? ` · ${p.registradoPor}` : ''}</span>
                            <span className="flex items-center gap-1 font-bold">
                              {formatearMoneda(p.monto)}
                              {esDuenio && !p.anulado && <button type="button" onClick={() => setAAnular(p.id)} className="flex size-7 items-center justify-center rounded text-rp-muted hover:text-rp-danger" aria-label="Anular pago"><X size={13} /></button>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          </article>
        ))}
      </div>

      <Modal isOpen={Boolean(cobrando)} onClose={() => setCobrando(null)} onSubmit={cobrar} title={`Cobrar a ${cobrando?.jugador.nombre ?? ''}`} size="sm">
        {pago && cobrando && (
          <div className="flex flex-col gap-3">
            {errorPago && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorPago}</p>}
            <p className="text-sm text-rp-muted">Debe <b className="text-rp-text">{formatearMoneda(cobrando.jugador.saldo)}</b>. Se puede cobrar una parte.</p>
            <Input label="Monto" type="number" min={1} value={String(pago.monto)} onChange={(e) => setPago({ ...pago, monto: Number(e.target.value) })} />
            <Select label="Cómo pagó" value={pago.medio} onChange={(e) => setPago({ ...pago, medio: e.target.value as PagoJugadorRequest['medio'] })}>
              {MEDIOS.map((m) => <option key={m.valor} value={m.valor}>{m.nombre}</option>)}
            </Select>
            <Input label="Fecha" type="date" value={pago.fecha} onChange={(e) => setPago({ ...pago, fecha: e.target.value })} />
            <Input label="Notas" value={pago.notas ?? ''} onChange={(e) => setPago({ ...pago, notas: e.target.value || null })} placeholder="Ej: transfirió desde la cuenta del compañero" />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCobrando(null)} disabled={guardando}>Cancelar</Button>
              <Button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Registrar pago'}</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={aAnular != null} onClose={() => setAAnular(null)} onConfirm={anular}
        title="Anular pago" description="El pago queda registrado como anulado y el jugador vuelve a deber ese monto." confirmLabel="Anular" loadingLabel="Anulando..." pedirMotivo />
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
