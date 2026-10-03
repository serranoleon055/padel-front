import { useEffect, useState } from 'react'

import { MEDIOS, type MedioPago } from '@/features/caja/cajaApi'
import { cuentaProveedorApi, type CuentaProveedorResponse } from '@/features/ventas/comprasApi'
import type { ProveedorResponse } from '@/features/ventas/ventasApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { fechaISO, formatearFecha, formatearMoneda } from '@/shared/lib/formatters'
import { aNumero } from '@/shared/lib/numeros'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Select } from '@/shared/ui/Select'
import { useToast } from '@/shared/ui/Toast'

type Props = {
  proveedor: ProveedorResponse | null
  onClose: () => void
  /** Se llama al pagar, para que la caja del día se actualice. */
  onPagado: () => void
}

/**
 * Qué le debe el club al proveedor y por qué.
 *
 * <p>Las compras a cuenta suman y los pagos restan, con el saldo que quedó en cada fila:
 * es como el club lo lee en el cuaderno. Una compra pagada en el momento no aparece, esa
 * plata ya salió por la caja.
 */
export function CuentaProveedorModal({ proveedor, onClose, onPagado }: Props) {
  const { success: avisoExito } = useToast()
  const [cuenta, setCuenta] = useState<CuentaProveedorResponse | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [monto, setMonto] = useState('')
  const [medio, setMedio] = useState<MedioPago>('EFECTIVO')
  const [fecha, setFecha] = useState(fechaISO())
  const [notas, setNotas] = useState('')
  const [pagando, setPagando] = useState(false)

  useEffect(() => {
    if (proveedor == null) return
    setCuenta(null)
    setMonto('')
    setMedio('EFECTIVO')
    setFecha(fechaISO())
    setNotas('')
    setError(null)
    setCargando(true)
    cuentaProveedorApi.cuenta(proveedor.id)
      .then(setCuenta)
      .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
      .finally(() => setCargando(false))
  }, [proveedor])

  async function pagar() {
    if (proveedor == null) return
    const importe = aNumero(monto)
    if (importe == null || importe <= 0) { setError('Poné cuánto le pagás.'); return }

    setPagando(true)
    try {
      const actualizada = await cuentaProveedorApi.pagar(proveedor.id, {
        fecha,
        monto: importe,
        medio,
        notas: notas.trim() || null,
      })
      setCuenta(actualizada)
      setMonto('')
      setNotas('')
      setError(null)
      avisoExito('Pago registrado.')
      onPagado()
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    } finally {
      setPagando(false)
    }
  }

  const saldo = cuenta?.saldo ?? 0

  return (
    <Modal
      isOpen={proveedor != null}
      onClose={onClose}
      onSubmit={pagar}
      title={`Cuenta de ${proveedor?.nombre ?? ''}`}
      size="lg"
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-md border border-rp-border px-3 py-2">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-rp-muted">Compras a cuenta</p>
            <p className="mt-1 text-base font-black text-rp-text">{formatearMoneda(cuenta?.comprasACredito ?? 0)}</p>
          </div>
          <div className="rounded-md border border-rp-border px-3 py-2">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-rp-muted">Pagado</p>
            <p className="mt-1 text-base font-black text-rp-text">{formatearMoneda(cuenta?.pagado ?? 0)}</p>
          </div>
          <div className="rounded-md border border-rp-border px-3 py-2">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-rp-muted">
              {saldo < 0 ? 'A favor del club' : 'Se le debe'}
            </p>
            <p className="mt-1 text-base font-black text-rp-text">{formatearMoneda(Math.abs(saldo))}</p>
          </div>
        </div>

        {saldo < 0 && (
          <p className="text-xs text-rp-muted">
            Queda a favor del club porque se anuló una compra que ya estaba paga. Los pagos van
            a la cuenta y no a un comprobante, así que esa plata se descuenta de la próxima o
            se le reclama.
          </p>
        )}

        {cargando ? (
          <p className="text-sm text-rp-muted">Cargando los movimientos...</p>
        ) : cuenta != null && cuenta.movimientos.length === 0 ? (
          <p className="rounded-md border border-rp-border px-3 py-4 text-sm text-rp-muted">
            No hay nada en la cuenta. Las compras que se pagan en el momento no entran acá:
            esa plata ya salió por la caja.
          </p>
        ) : cuenta != null && (
          <div className="max-h-64 overflow-y-auto rounded-md border border-rp-border">
            <table className="w-full text-sm">
              <caption className="sr-only">Movimientos de la cuenta corriente del proveedor</caption>
              <thead className="sticky top-0 bg-rp-surface-2">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-black uppercase tracking-[0.14em] text-rp-muted">Fecha</th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-black uppercase tracking-[0.14em] text-rp-muted">Concepto</th>
                  <th scope="col" className="px-3 py-2 text-right text-xs font-black uppercase tracking-[0.14em] text-rp-muted">Monto</th>
                  <th scope="col" className="px-3 py-2 text-right text-xs font-black uppercase tracking-[0.14em] text-rp-muted">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rp-border">
                {cuenta.movimientos.map((movimiento, indice) => (
                  <tr key={`${movimiento.tipo}-${indice}`}>
                    <td className="whitespace-nowrap px-3 py-2 text-rp-muted">{formatearFecha(movimiento.fecha)}</td>
                    <td className="px-3 py-2 text-rp-text">{movimiento.descripcion}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-bold text-rp-text">
                      {formatearMoneda(movimiento.monto)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-rp-muted">
                      {formatearMoneda(movimiento.saldoAcumulado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <fieldset className="rounded-md border border-rp-border px-3 py-3">
          <legend className="px-1 text-xs font-black uppercase tracking-[0.14em] text-rp-muted">Pagarle</legend>
          <p className="mb-3 text-xs text-rp-muted">
            Esto sí sale del cajón y se descuenta del arqueo de esta jornada.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Monto" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="20000" />
            <Select label="Cómo se paga" value={medio} onChange={(e) => setMedio(e.target.value as MedioPago)}>
              {MEDIOS.map((m) => <option key={m.valor} value={m.valor}>{m.nombre}</option>)}
            </Select>
            <Input label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="mt-3">
            <Input label="Notas" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Opcional" />
          </div>
        </fieldset>

        {error && <p role="alert" className="text-sm font-bold text-rp-danger">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cerrar</Button>
          <Button type="submit" disabled={pagando || saldo <= 0}>
            {pagando ? 'Registrando...' : 'Registrar pago'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
