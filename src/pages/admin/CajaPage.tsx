import { Banknote, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { cajaApi, MEDIOS, type CierreCaja } from '@/features/caja/cajaApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { formatearFecha, formatearMoneda } from '@/shared/lib/formatters'
import { AdminPageHeader } from '@/shared/ui/AdminPageHeader'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { useToast } from '@/shared/ui/Toast'

function aISO(fecha: Date) {
  return fecha.toISOString().slice(0, 10)
}

function nombreMedio(medio: string) {
  return MEDIOS.find((m) => m.valor === medio)?.nombre ?? medio
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
