import { Banknote, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { cajaApi, CATEGORIAS_GASTO, MEDIOS, type CategoriaGasto, type CierreCaja, type MedioPago } from '@/features/caja/cajaApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { formatearFecha, formatearMoneda } from '@/shared/lib/formatters'
import { AdminPageHeader } from '@/shared/ui/AdminPageHeader'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Select } from '@/shared/ui/Select'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { useToast } from '@/shared/ui/Toast'

function aISO(fecha: Date) {
  return fecha.toISOString().slice(0, 10)
}

function nombreMedio(medio: string) {
  return MEDIOS.find((m) => m.valor === medio)?.nombre ?? medio
}

function nombreCategoria(categoria: string) {
  return CATEGORIAS_GASTO.find((c) => c.valor === categoria)?.nombre ?? categoria
}

/** El monto se escribe como texto (nada de type=number) y se limpia al enviar. */
function aNumero(valor: string): number | null {
  const limpio = valor.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  if (!limpio) return null
  const numero = Number(limpio)
  return Number.isFinite(numero) ? numero : null
}

const GASTO_VACIO = {
  fecha: aISO(new Date()),
  categoria: 'OTRO' as CategoriaGasto,
  descripcion: '',
  monto: '',
  medio: 'EFECTIVO' as MedioPago,
  proveedor: '',
}

function hhmm(iso: string) {
  return iso.slice(11, 16)
}

export default function CajaPage() {
  const [fecha, setFecha] = useState(aISO(new Date()))
  const [datos, setDatos] = useState<CierreCaja | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aAnular, setAAnular] = useState<number | null>(null)
  const [anulando, setAnulando] = useState(false)
  const { success: avisoExito } = useToast()

  const [gastoAbierto, setGastoAbierto] = useState(false)
  const [formGasto, setFormGasto] = useState({ ...GASTO_VACIO })
  const [guardandoGasto, setGuardandoGasto] = useState(false)
  const [errorGasto, setErrorGasto] = useState<string | null>(null)
  const [aBorrarGasto, setABorrarGasto] = useState<number | null>(null)
  const [borrandoGasto, setBorrandoGasto] = useState(false)

  function cargar() {
    setCargando(true)
    cajaApi.cierre(fecha)
      .then((d) => { setDatos(d); setError(null) })
      .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
      .finally(() => setCargando(false))
  }
  useEffect(cargar, [fecha])

  function correrDia(dias: number) {
    const d = new Date(`${fecha}T12:00:00`)
    d.setDate(d.getDate() + dias)
    setFecha(aISO(d))
  }

  function abrirGasto() {
    setFormGasto({ ...GASTO_VACIO, fecha })
    setErrorGasto(null)
    setGastoAbierto(true)
  }

  async function guardarGasto() {
    if (!formGasto.descripcion.trim()) { setErrorGasto('Describí el gasto.'); return }
    const monto = aNumero(formGasto.monto)
    if (monto == null || monto <= 0) { setErrorGasto('Ingresá un monto válido.'); return }

    setGuardandoGasto(true); setErrorGasto(null)
    try {
      await cajaApi.registrarGasto({
        fecha: formGasto.fecha,
        categoria: formGasto.categoria,
        descripcion: formGasto.descripcion.trim(),
        monto,
        medio: formGasto.medio,
        proveedor: formGasto.proveedor.trim() || null,
        notas: null,
      })
      setGastoAbierto(false)
      cargar()
      avisoExito('Gasto registrado')
    } catch (e: unknown) {
      setErrorGasto(obtenerMensajeErrorApi(e))
    } finally { setGuardandoGasto(false) }
  }

  async function borrarGasto() {
    if (aBorrarGasto == null) return
    setBorrandoGasto(true)
    try {
      await cajaApi.eliminarGasto(aBorrarGasto)
      setABorrarGasto(null)
      cargar()
      avisoExito('Gasto eliminado')
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e)); setABorrarGasto(null)
    } finally { setBorrandoGasto(false) }
  }

  async function anular() {
    if (aAnular == null) return
    setAnulando(true)
    try {
      await cajaApi.anular(aAnular)
      setAAnular(null)
      cargar()
      avisoExito('Cobro anulado')
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e)); setAAnular(null)
    } finally { setAnulando(false) }
  }

  return (
    <section>
      <AdminPageHeader title={<><Banknote size={26} />Caja</>} />

      <div className="mt-4 flex items-center gap-2">
        <button onClick={() => correrDia(-1)} className="flex size-9 items-center justify-center rounded-md border border-rp-border text-rp-muted hover:text-rp-accent" aria-label="Día anterior"><ChevronLeft size={16} /></button>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="h-9 rounded-md border border-rp-border bg-rp-surface px-3 text-sm text-rp-text"
        />
        <button onClick={() => correrDia(1)} className="flex size-9 items-center justify-center rounded-md border border-rp-border text-rp-muted hover:text-rp-accent" aria-label="Día siguiente"><ChevronRight size={16} /></button>
        <Button size="sm" variant="subtle" onClick={() => setFecha(aISO(new Date()))}>Hoy</Button>
      </div>

      {error && <p className="mt-4 rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{error}</p>}
      {cargando && <p className="mt-6 text-sm text-rp-muted">Cargando...</p>}

      {datos && !cargando && (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-rp-accent/40 bg-rp-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-rp-muted">Efectivo en caja</p>
              <p className="mt-1 text-3xl font-black text-rp-accent">{formatearMoneda(datos.efectivoEsperado)}</p>
              <p className="mt-1 text-xs text-rp-muted">Lo que tiene que estar en el cajón.</p>
            </div>
            <div className="rounded-lg border border-rp-border bg-rp-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-rp-muted">Cobrado en el club</p>
              <p className="mt-1 text-3xl font-black text-rp-text">{formatearMoneda(datos.totalMostrador)}</p>
              <p className="mt-1 text-xs text-rp-muted">Todos los medios.</p>
            </div>
            <div className="rounded-lg border border-rp-border bg-rp-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-rp-muted">Señas online</p>
              <p className="mt-1 text-3xl font-black text-rp-text">{formatearMoneda(datos.seniasOnline)}</p>
              <p className="mt-1 text-xs text-rp-muted">Acreditadas en Mercado Pago.</p>
            </div>
            <div className="rounded-lg border border-rp-border bg-rp-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-rp-muted">Falta cobrar</p>
              <p className={`mt-1 text-3xl font-black ${datos.saldoPendiente > 0 ? 'text-rp-danger' : 'text-rp-text'}`}>
                {formatearMoneda(datos.saldoPendiente)}
              </p>
              <p className="mt-1 text-xs text-rp-muted">{datos.turnosConSaldo} turno(s) con saldo.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-rp-border bg-rp-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-rp-muted">Gastos del día</p>
              <p className="mt-1 text-3xl font-black text-rp-text">{formatearMoneda(datos.egresos)}</p>
              <p className="mt-1 text-xs text-rp-muted">
                {formatearMoneda(datos.egresosEfectivo)} salieron del cajón.
              </p>
            </div>
            <div className="rounded-lg border border-rp-border bg-rp-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-rp-muted">Resultado del día</p>
              <p className={`mt-1 text-3xl font-black ${datos.resultado < 0 ? 'text-rp-danger' : 'text-rp-accent'}`}>
                {formatearMoneda(datos.resultado)}
              </p>
              <p className="mt-1 text-xs text-rp-muted">Lo que entró menos lo que se gastó.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="rounded-lg border border-rp-border bg-rp-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-rp-muted">Por medio de pago</p>
              {datos.porMedio.length === 0 ? (
                <p className="mt-3 text-sm text-rp-muted">Sin cobros en el día.</p>
              ) : (
                <div className="mt-3 flex flex-col gap-2">
                  {datos.porMedio.map((medio) => (
                    <div key={medio.medio} className="flex items-center justify-between border-b border-rp-border pb-2 last:border-0">
                      <span className="text-sm text-rp-text">{nombreMedio(medio.medio)}<span className="ml-1 text-xs text-rp-muted">({medio.cantidad})</span></span>
                      <span className="text-sm font-bold text-rp-text">{formatearMoneda(medio.total)}</span>
                    </div>
                  ))}
                  <div className="mt-1 flex items-center justify-between pt-1">
                    <span className="text-sm font-bold text-rp-muted">Total del día</span>
                    <span className="text-sm font-black text-rp-accent">{formatearMoneda(datos.totalDelDia)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-rp-border bg-rp-surface p-4 lg:col-span-2">
              <p className="text-xs font-bold uppercase tracking-wide text-rp-muted">
                Movimientos del {formatearFecha(datos.fecha)}
              </p>
              {datos.movimientos.length === 0 ? (
                <p className="mt-3 text-sm text-rp-muted">Todavía no se cobró nada.</p>
              ) : (
                <div className="mt-3 max-h-96 overflow-y-auto">
                  {datos.movimientos.map((mov) => (
                    <div key={mov.id} className="flex items-center justify-between gap-3 border-b border-rp-border py-2 last:border-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-rp-text">{mov.clienteNombre}</p>
                        <p className="text-xs text-rp-muted">
                          {hhmm(mov.cobradoEn)} · {nombreMedio(mov.medio)}
                          {mov.canchaNombre ? ` · ${mov.canchaNombre}` : ''}
                          {mov.registradoPor ? ` · ${mov.registradoPor}` : ''}
                        </p>
                        {mov.notas && <p className="text-xs italic text-rp-muted">{mov.notas}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-bold text-rp-text">{formatearMoneda(mov.monto)}</span>
                        <button onClick={() => setAAnular(mov.id)} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger" aria-label="Anular cobro" title="Anular cobro"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {datos && !cargando && (
        <div className="mt-6 rounded-lg border border-rp-border bg-rp-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-rp-muted">Gastos del {formatearFecha(datos.fecha)}</p>
            <Button size="sm" variant="subtle" onClick={abrirGasto}><Plus size={15} />Registrar gasto</Button>
          </div>
          {datos.gastos.length === 0 ? (
            <p className="mt-3 text-sm text-rp-muted">Sin gastos cargados en el día.</p>
          ) : (
            <div className="mt-3">
              {datos.gastos.map((gasto) => (
                <div key={gasto.id} className="flex items-center justify-between gap-3 border-b border-rp-border py-2 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-rp-text">{gasto.descripcion}</p>
                    <p className="text-xs text-rp-muted">
                      {nombreCategoria(gasto.categoria)} · {nombreMedio(gasto.medio)}
                      {gasto.proveedor ? ` · ${gasto.proveedor}` : ''}
                      {gasto.registradoPor ? ` · ${gasto.registradoPor}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-bold text-rp-danger">−{formatearMoneda(gasto.monto)}</span>
                    <button onClick={() => setABorrarGasto(gasto.id)} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger" aria-label="Eliminar gasto" title="Eliminar gasto"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal isOpen={gastoAbierto} onClose={() => setGastoAbierto(false)} onSubmit={guardarGasto} title="Registrar gasto" size="sm">
        <div className="flex flex-col gap-4">
          <Input label="Descripción" value={formGasto.descripcion} onChange={(e) => setFormGasto((f) => ({ ...f, descripcion: e.target.value }))} placeholder="Factura de luz de julio" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Categoría" value={formGasto.categoria} onChange={(e) => setFormGasto((f) => ({ ...f, categoria: e.target.value as CategoriaGasto }))}>
              {CATEGORIAS_GASTO.map((c) => <option key={c.valor} value={c.valor}>{c.nombre}</option>)}
            </Select>
            <Select label="Cómo se pagó" value={formGasto.medio} onChange={(e) => setFormGasto((f) => ({ ...f, medio: e.target.value as MedioPago }))}>
              {MEDIOS.map((m) => <option key={m.valor} value={m.valor}>{m.nombre}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Monto" value={formGasto.monto} onChange={(e) => setFormGasto((f) => ({ ...f, monto: e.target.value }))} />
            <Input label="Fecha" type="date" value={formGasto.fecha} onChange={(e) => setFormGasto((f) => ({ ...f, fecha: e.target.value }))} />
          </div>
          <p className="-mt-2 text-[11px] text-rp-muted">La fecha es la del gasto: una factura de julio pagada en agosto pesa en julio.</p>
          <Input label="Proveedor (opcional)" value={formGasto.proveedor} onChange={(e) => setFormGasto((f) => ({ ...f, proveedor: e.target.value }))} />
          {errorGasto && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorGasto}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setGastoAbierto(false)} disabled={guardandoGasto}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={guardandoGasto}>{guardandoGasto ? 'Guardando...' : 'Registrar'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={aBorrarGasto != null}
        onClose={() => setABorrarGasto(null)}
        onConfirm={borrarGasto}
        title="Eliminar gasto"
        description="El gasto se borra y vuelve a cambiar el resultado del día y del mes."
        isLoading={borrandoGasto}
      />

      <ConfirmDialog
        isOpen={aAnular != null}
        onClose={() => setAAnular(null)}
        onConfirm={anular}
        title="Anular cobro"
        description="El cobro se borra y el turno vuelve a quedar con saldo pendiente."
        isLoading={anulando}
      />
    </section>
  )
}
