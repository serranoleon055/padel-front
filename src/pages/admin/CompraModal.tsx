import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { MEDIOS, type MedioPago } from '@/features/caja/cajaApi'
import { TIPOS_COMPROBANTE, comprasApi, type TipoComprobanteCompra } from '@/features/ventas/comprasApi'
import type { ProductoResponse, ProveedorResponse } from '@/features/ventas/ventasApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { formatearMoneda } from '@/shared/lib/formatters'
import { aNumero } from '@/shared/lib/numeros'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Select } from '@/shared/ui/Select'
import { useToast } from '@/shared/ui/Toast'

type Renglon = { productoId: number; nombre: string; cantidad: string; costoUnitario: string }

type Props = {
  abierto: boolean
  onClose: () => void
  /** Se llama al cargar la compra, para refrescar el stock y el listado. */
  onCargada: () => void
  productos: ProductoResponse[]
  proveedores: ProveedorResponse[]
  /** Jornada del club: la fecha arranca en el día de caja, no en el de calendario. */
  fechaInicial: string
}

/**
 * Una compra tal como vino el papel: un comprobante con todos sus productos.
 *
 * <p>Antes la mercadería se cargaba de a un producto por vez, así que un remito de doce
 * eran doce gastos sueltos en la rentabilidad del mes, imposibles de reconciliar contra
 * el comprobante que el club tiene en la mano.
 */
export function CompraModal({ abierto, onClose, onCargada, productos, proveedores, fechaInicial }: Props) {
  const { success: avisoExito } = useToast()
  const [proveedorId, setProveedorId] = useState('')
  const [tipoComprobante, setTipoComprobante] = useState<TipoComprobanteCompra>('REMITO')
  const [numero, setNumero] = useState('')
  const [fecha, setFecha] = useState(fechaInicial)
  // 'CUENTA' = queda a cuenta corriente: la mercadería entró y la plata no salió.
  const [medio, setMedio] = useState<MedioPago | 'CUENTA'>('EFECTIVO')
  const [notas, setNotas] = useState('')
  const [renglones, setRenglones] = useState<Renglon[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!abierto) return
    setProveedorId('')
    setTipoComprobante('REMITO')
    setNumero('')
    setFecha(fechaInicial)
    setMedio('EFECTIVO')
    setNotas('')
    setRenglones([])
    setBusqueda('')
    setError(null)
  }, [abierto, fechaInicial])

  // Solo los que llevan stock: comprar un alquiler de paleta no significa nada.
  const comprables = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return productos.filter((producto) => producto.controlaStock && producto.activo
      && (!texto || producto.nombre.toLowerCase().includes(texto)))
  }, [productos, busqueda])

  const total = useMemo(
    () => renglones.reduce((suma, renglon) => {
      const cantidad = aNumero(renglon.cantidad) ?? 0
      const costo = aNumero(renglon.costoUnitario) ?? 0
      return suma + cantidad * costo
    }, 0),
    [renglones],
  )

  function agregar(producto: ProductoResponse) {
    setError(null)
    setBusqueda('')
    // El mismo producto puede ir en dos renglones: el proveedor a veces factura dos lotes
    // a precios distintos, y el backend los pondera para que el total dé el del papel.
    setRenglones((actuales) => [...actuales, {
      productoId: producto.id,
      nombre: producto.nombre,
      cantidad: '1',
      costoUnitario: producto.costo != null ? String(producto.costo) : '',
    }])
  }

  function cambiar(indice: number, campo: 'cantidad' | 'costoUnitario', valor: string) {
    setRenglones((actuales) => actuales.map((renglon, i) => (
      i === indice ? { ...renglon, [campo]: valor } : renglon
    )))
  }

  function quitar(indice: number) {
    setRenglones((actuales) => actuales.filter((_, i) => i !== indice))
  }

  async function guardar() {
    if (!proveedorId) { setError('Elegí el proveedor.'); return }
    if (!numero.trim()) { setError('Poné el número del comprobante.'); return }
    if (!fecha) { setError('Indicá la fecha del comprobante.'); return }
    if (renglones.length === 0) { setError('Agregá al menos un producto.'); return }

    const items = []
    for (const renglon of renglones) {
      const cantidad = aNumero(renglon.cantidad)
      const costoUnitario = aNumero(renglon.costoUnitario)
      if (cantidad == null || cantidad < 1) {
        setError(`Revisá la cantidad de ${renglon.nombre}.`)
        return
      }
      if (costoUnitario == null || costoUnitario < 0) {
        setError(`Indicá cuánto costó cada ${renglon.nombre}.`)
        return
      }
      items.push({ productoId: renglon.productoId, cantidad, costoUnitario })
    }

    setGuardando(true)
    try {
      await comprasApi.registrar({
        proveedorId: Number(proveedorId),
        tipoComprobante,
        numero: numero.trim(),
        fecha,
        medio: medio === 'CUENTA' ? null : medio,
        items,
        notas: notas.trim() || null,
      })
      avisoExito(medio === 'CUENTA'
        ? 'Compra cargada. Quedó en la cuenta del proveedor.'
        : 'Compra cargada.')
      onCargada()
      onClose()
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal isOpen={abierto} onClose={onClose} onSubmit={guardar} title="Cargar una compra" size="lg">
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Proveedor" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
            <option value="">Elegí el proveedor</option>
            {proveedores.filter((p) => p.activo).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </Select>
          <Input label="Fecha del comprobante" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Comprobante" value={tipoComprobante} onChange={(e) => setTipoComprobante(e.target.value as TipoComprobanteCompra)}>
            {TIPOS_COMPROBANTE.map((t) => <option key={t.valor} value={t.valor}>{t.nombre}</option>)}
          </Select>
          <Input label="Número" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="0001-00012345" />
        </div>

        <div>
          <Select label="Cómo se pagó" value={medio} onChange={(e) => setMedio(e.target.value as MedioPago | 'CUENTA')}>
            {MEDIOS.map((m) => <option key={m.valor} value={m.valor}>{m.nombre}</option>)}
            <option value="CUENTA">Queda a cuenta del proveedor</option>
          </Select>
          <p className="mt-1.5 text-xs text-rp-muted">
            {medio === 'CUENTA'
              ? 'La mercadería entra y pesa en la rentabilidad del mes, pero la plata todavía no sale del cajón.'
              : 'Sale del cajón hoy y se descuenta del arqueo de esta jornada.'}
          </p>
        </div>

        <div className="rounded-md border border-rp-border">
          <div className="border-b border-rp-border px-3 py-2">
            <Input
              placeholder="Buscar producto para agregar..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar producto para agregar al comprobante"
            />
            {busqueda.trim() !== '' && (
              <ul className="mt-2 max-h-44 overflow-y-auto">
                {comprables.length === 0 && (
                  <li className="px-1 py-2 text-sm text-rp-muted">Ningún producto con stock coincide.</li>
                )}
                {comprables.map((producto) => (
                  <li key={producto.id}>
                    <button
                      type="button"
                      onClick={() => agregar(producto)}
                      aria-label={`Agregar ${producto.nombre} al comprobante`}
                      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-2 text-left text-sm text-rp-text hover:bg-rp-surface-2"
                    >
                      <span>{producto.nombre}</span>
                      <span className="text-xs text-rp-muted">
                        Stock {producto.stock}
                        {producto.costo != null ? ` · último costo ${formatearMoneda(producto.costo)}` : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {renglones.length === 0 ? (
            <p className="px-3 py-4 text-sm text-rp-muted">
              Buscá arriba cada producto del comprobante y agregalo. Si el proveedor facturó el
              mismo producto en dos renglones a precios distintos, cargá los dos.
            </p>
          ) : (
            <ul className="divide-y divide-rp-border">
              {renglones.map((renglon, indice) => {
                const subtotal = (aNumero(renglon.cantidad) ?? 0) * (aNumero(renglon.costoUnitario) ?? 0)
                return (
                  <li key={`${renglon.productoId}-${indice}`} className="flex flex-wrap items-end gap-3 px-3 py-3">
                    {/* En el celular el nombre se lleva la primera línea entera: compartiendo
                        fila con los campos quedaba encajado entre "Cant." y "Costo c/u". */}
                    <span className="basis-full text-sm font-bold text-rp-text sm:min-w-32 sm:flex-1 sm:basis-auto">
                      {renglon.nombre}
                    </span>
                    {/* El id va explícito: con el que arma el label solo, los renglones
                        comparten el mismo y tocar el rótulo del segundo enfoca el primero. */}
                    <div className="w-20">
                      <Input
                        id={`compra-cantidad-${indice}`}
                        label="Cant."
                        soloNumeros
                        value={renglon.cantidad}
                        onChange={(e) => cambiar(indice, 'cantidad', e.target.value)}
                      />
                    </div>
                    <div className="w-28">
                      <Input
                        id={`compra-costo-${indice}`}
                        label="Costo c/u"
                        value={renglon.costoUnitario}
                        onChange={(e) => cambiar(indice, 'costoUnitario', e.target.value)}
                        placeholder="1500"
                      />
                    </div>
                    <span className="min-w-16 flex-1 pb-3 text-right text-sm font-bold text-rp-text">
                      {formatearMoneda(subtotal)}
                    </span>
                    <button
                      type="button"
                      onClick={() => quitar(indice)}
                      className="mb-1 flex size-11 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger"
                      aria-label={`Quitar ${renglon.nombre} del comprobante`}
                    ><Trash2 size={15} /></button>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="flex items-center justify-between border-t border-rp-border px-3 py-2">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-rp-muted">Total</span>
            <span className="text-lg font-black text-rp-text">{formatearMoneda(total)}</span>
          </div>
        </div>

        <Input label="Notas" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Opcional" />

        {error && <p role="alert" className="text-sm font-bold text-rp-danger">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={guardando}>
            <Plus size={16} />{guardando ? 'Cargando...' : 'Cargar compra'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
