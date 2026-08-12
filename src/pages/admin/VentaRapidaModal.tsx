import { Minus, Plus, ShoppingCart } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { MEDIOS, type MedioPago } from '@/features/caja/cajaApi'
import { CATEGORIAS_PRODUCTO, productosApi, ventasApi, type ProductoResponse } from '@/features/ventas/ventasApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { formatearMoneda } from '@/shared/lib/formatters'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Select } from '@/shared/ui/Select'
import { useToast } from '@/shared/ui/Toast'

type Props = {
  abierto: boolean
  onClose: () => void
  /** Se llama al registrar la venta, para que la caja se actualice. */
  onVendido: () => void
  /** Turno al que cargar el consumo. Sin esto es una venta suelta de mostrador. */
  turno?: { id: number; clienteNombre: string; horario: string } | null
}

function nombreCategoria(categoria: string) {
  return CATEGORIAS_PRODUCTO.find((c) => c.valor === categoria)?.nombre ?? categoria
}

/**
 * Venta de mostrador. Se toca el producto y se suma al carrito: el que atiende tiene una
 * mano en el teléfono y la otra en la caja, así que todo se resuelve con un dedo.
 */
export function VentaRapidaModal({ abierto, onClose, onVendido, turno = null }: Props) {
  const { success: avisoExito } = useToast()
  const [productos, setProductos] = useState<ProductoResponse[]>([])
  const [carrito, setCarrito] = useState<Record<number, number>>({})
  // 'CUENTA' = va anotado al turno y se cobra al final junto con la cancha.
  const [medio, setMedio] = useState<MedioPago | 'CUENTA'>('EFECTIVO')
  const [busqueda, setBusqueda] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!abierto) return
    setCarrito({})
    setBusqueda('')
    setMedio(turno ? 'CUENTA' : 'EFECTIVO')
    setError(null)
    productosApi.getAll().then(setProductos).catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
  }, [abierto, turno])

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return productos.filter((producto) => !texto || producto.nombre.toLowerCase().includes(texto))
  }, [productos, busqueda])

  const total = useMemo(
    () => Object.entries(carrito).reduce((suma, [id, cantidad]) => {
      const producto = productos.find((p) => p.id === Number(id))
      return suma + (producto ? producto.precioVenta * cantidad : 0)
    }, 0),
    [carrito, productos],
  )

  function sumar(producto: ProductoResponse) {
    const enCarrito = carrito[producto.id] ?? 0
    if (producto.controlaStock && enCarrito >= producto.stock) {
      setError(`No hay más stock de "${producto.nombre}": quedan ${producto.stock}.`)
      return
    }
    setError(null)
    setCarrito((actual) => ({ ...actual, [producto.id]: enCarrito + 1 }))
  }

  function restar(productoId: number) {
    setCarrito((actual) => {
      const cantidad = (actual[productoId] ?? 0) - 1
      const nuevo = { ...actual }
      if (cantidad <= 0) delete nuevo[productoId]
      else nuevo[productoId] = cantidad
      return nuevo
    })
  }

  async function cobrar() {
    const items = Object.entries(carrito).map(([id, cantidad]) => ({ productoId: Number(id), cantidad }))
    if (items.length === 0) { setError('Agregá al menos un producto.'); return }

    setGuardando(true); setError(null)
    try {
      const aCuenta = medio === 'CUENTA'
      await ventasApi.registrar({
        items,
        // Sin medio, el backend lo anota como deuda del turno en vez de plata cobrada.
        medio: aCuenta ? null : medio,
        reservaId: turno?.id ?? null,
      })
      avisoExito(aCuenta
        ? `Anotado en la cuenta de ${turno?.clienteNombre}: ${formatearMoneda(total)}`
        : `Venta registrada por ${formatearMoneda(total)}`)
      onVendido()
      onClose()
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    } finally { setGuardando(false) }
  }

  return (
    <Modal
      isOpen={abierto}
      onClose={onClose}
      onSubmit={cobrar}
      title={turno ? `Consumo de ${turno.clienteNombre}` : 'Vender en el mostrador'}
      size="md"
    >
      <div className="flex flex-col gap-4">
        {turno && (
          <p className="rounded-md border border-rp-accent/40 bg-rp-accent/10 px-3 py-2 text-sm text-rp-text">
            Se anota en el turno de las <b>{turno.horario}</b> hs y se cobra todo junto al final.
          </p>
        )}
        <Input placeholder="Buscar producto..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />

        {visibles.length === 0 ? (
          <p className="rounded-md border border-rp-border bg-rp-surface-2 px-3 py-2 text-sm text-rp-muted">
            No hay productos cargados. Agregalos desde Productos.
          </p>
        ) : (
          <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {visibles.map((producto) => {
              const sinStock = producto.controlaStock && producto.stock <= 0
              return (
                <button
                  key={producto.id}
                  type="button"
                  disabled={sinStock}
                  onClick={() => sumar(producto)}
                  className={sinStock
                    ? 'cursor-not-allowed rounded-md border border-rp-border bg-rp-surface-2 p-2 text-left opacity-50'
                    : 'rounded-md border border-rp-border bg-rp-surface p-2 text-left transition hover:border-rp-accent'}
                >
                  <p className="truncate text-sm font-bold text-rp-text">{producto.nombre}</p>
                  <p className="text-xs text-rp-accent">{formatearMoneda(producto.precioVenta)}</p>
                  <p className="text-[10px] text-rp-muted">
                    {nombreCategoria(producto.categoria)}
                    {producto.controlaStock ? ` · ${sinStock ? 'sin stock' : `quedan ${producto.stock}`}` : ''}
                  </p>
                </button>
              )
            })}
          </div>
        )}

        <div className="rounded-md border border-rp-border bg-rp-surface-2 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-rp-muted">
            <ShoppingCart size={14} />Lo que se lleva
          </p>
          {Object.keys(carrito).length === 0 ? (
            <p className="text-sm text-rp-muted">Todavía no agregaste nada.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {Object.entries(carrito).map(([id, cantidad]) => {
                const producto = productos.find((p) => p.id === Number(id))
                if (!producto) return null
                return (
                  <div key={id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm text-rp-text">{producto.nombre}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <button type="button" onClick={() => restar(producto.id)} className="flex size-7 items-center justify-center rounded-md border border-rp-border text-rp-muted hover:text-rp-danger" aria-label="Quitar uno"><Minus size={13} /></button>
                      <span className="w-6 text-center text-sm font-bold text-rp-text">{cantidad}</span>
                      <button type="button" onClick={() => sumar(producto)} className="flex size-7 items-center justify-center rounded-md border border-rp-border text-rp-muted hover:text-rp-accent" aria-label="Agregar uno"><Plus size={13} /></button>
                      <span className="w-24 text-right text-sm font-bold text-rp-text">
                        {formatearMoneda(producto.precioVenta * cantidad)}
                      </span>
                    </div>
                  </div>
                )
              })}
              <div className="mt-2 flex items-center justify-between border-t border-rp-border pt-2">
                <span className="text-sm font-bold text-rp-muted">Total</span>
                <span className="text-xl font-black text-rp-accent">{formatearMoneda(total)}</span>
              </div>
            </div>
          )}
        </div>

        <Select label="Cómo pagó" value={medio} onChange={(e) => setMedio(e.target.value as MedioPago | 'CUENTA')}>
          {turno && <option value="CUENTA">A la cuenta del turno (se cobra al final)</option>}
          {MEDIOS.map((m) => <option key={m.valor} value={m.valor}>{m.nombre}</option>)}
        </Select>

        {error && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={guardando}>Cancelar</Button>
          <Button type="submit" size="sm" disabled={guardando || total <= 0}>
            {guardando
              ? 'Registrando...'
              : `${medio === 'CUENTA' ? 'Anotar' : 'Cobrar'} ${formatearMoneda(total)}`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
