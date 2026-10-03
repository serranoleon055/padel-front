import { Minus, Plus, ShoppingCart } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { MEDIOS, type MedioPago } from '@/features/caja/cajaApi'
import { CATEGORIAS_PRODUCTO, productosApi, ventasApi, type ProductoResponse } from '@/features/ventas/ventasApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { formatearMoneda } from '@/shared/lib/formatters'
import { aNumero } from '@/shared/lib/numeros'
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
  /**
   * El carrito va por producto Y presentación: "1 tubo" y "2 sueltas" son dos renglones
   * distintos del mismo producto, con precios distintos. La clave los separa.
   */
  const [carrito, setCarrito] = useState<Record<string, number>>({})
  // 'CUENTA' = va anotado al turno y se cobra al final junto con la cancha.
  const [medio, setMedio] = useState<MedioPago | 'CUENTA'>('EFECTIVO')
  const [busqueda, setBusqueda] = useState('')
  const [descuento, setDescuento] = useState('')
  const [motivoDescuento, setMotivoDescuento] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!abierto) return
    setCarrito({})
    setBusqueda('')
    setDescuento('')
    setMotivoDescuento('')
    setMedio(turno ? 'CUENTA' : 'EFECTIVO')
    setError(null)
    productosApi.getAll().then(setProductos).catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
  }, [abierto, turno])

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return productos.filter((producto) => !texto || producto.nombre.toLowerCase().includes(texto))
  }, [productos, busqueda])

  /**
   * Lo que se puede tocar para vender: un botón por presentación, o uno solo con el
   * producto cuando no tiene. Así el que atiende elige "tubo" o "suelta" de un dedo, sin
   * tener que saber que son el mismo producto.
   */
  const opciones = useMemo(
    () => visibles.flatMap((producto) => (
      producto.presentaciones.length > 0
        ? producto.presentaciones.map((presentacion) => ({
            clave: `${producto.id}|${presentacion.id}`,
            producto,
            presentacionId: presentacion.id,
            etiqueta: `${producto.nombre} · ${presentacion.nombre}`,
            precio: presentacion.precioVenta,
            unidades: presentacion.unidades,
          }))
        : [{
            clave: `${producto.id}|`,
            producto,
            presentacionId: null as number | null,
            etiqueta: producto.nombre,
            precio: producto.precioVenta,
            unidades: 1,
          }]
    )),
    [visibles],
  )
  const porClave = useMemo(() => new Map(opciones.map((o) => [o.clave, o])), [opciones])

  /** Unidades base que el carrito ya tiene de un producto, contando los packs. */
  const unidadesEnCarrito = (productoId: number) => Object.entries(carrito).reduce(
    (suma, [clave, cantidad]) => {
      const opcion = porClave.get(clave)
      return opcion && opcion.producto.id === productoId ? suma + cantidad * opcion.unidades : suma
    },
    0,
  )

  const total = useMemo(
    () => Object.entries(carrito).reduce((suma, [clave, cantidad]) => {
      const opcion = porClave.get(clave)
      return suma + (opcion ? opcion.precio * cantidad : 0)
    }, 0),
    [carrito, porClave],
  )

  /** Lo tipeado en el descuento, limpio. Nunca negativo ni mayor que la venta. */
  const aBonificar = useMemo(
    () => Math.max(0, Math.min(total, aNumero(descuento) ?? 0)),
    [descuento, total],
  )
  const aCobrar = total - aBonificar

  function sumar(clave: string) {
    const opcion = porClave.get(clave)
    if (!opcion) return
    const { producto, unidades } = opcion
    // Se cuenta en unidades base: un tubo son tres pelotas, y mezclado con sueltas el
    // tope es el stock del producto, no el de cada renglón.
    if (producto.controlaStock && unidadesEnCarrito(producto.id) + unidades > producto.stock) {
      setError(`No hay más stock de "${producto.nombre}": quedan ${producto.stock}.`)
      return
    }
    setError(null)
    setCarrito((actual) => ({ ...actual, [clave]: (actual[clave] ?? 0) + 1 }))
  }

  function restar(clave: string) {
    setCarrito((actual) => {
      const cantidad = (actual[clave] ?? 0) - 1
      const nuevo = { ...actual }
      if (cantidad <= 0) delete nuevo[clave]
      else nuevo[clave] = cantidad
      return nuevo
    })
  }

  async function cobrar() {
    const items = Object.entries(carrito).map(([clave, cantidad]) => {
      const opcion = porClave.get(clave)
      return {
        productoId: opcion!.producto.id,
        presentacionId: opcion!.presentacionId,
        cantidad,
      }
    })
    if (items.length === 0) { setError('Agregá al menos un producto.'); return }
    if (aBonificar > total) { setError('El descuento no puede ser mayor que la venta.'); return }
    if (aBonificar > 0 && !motivoDescuento.trim()) {
      setError('Decí por qué se bonifica.')
      return
    }

    setGuardando(true); setError(null)
    try {
      const aCuenta = medio === 'CUENTA'
      await ventasApi.registrar({
        items,
        // Sin medio, el backend lo anota como deuda del turno en vez de plata cobrada.
        medio: aCuenta ? null : medio,
        reservaId: turno?.id ?? null,
        descuento: aBonificar > 0 ? aBonificar : null,
        motivoDescuento: aBonificar > 0 ? motivoDescuento.trim() : null,
      })
      avisoExito(aCuenta
        ? `Anotado en la cuenta de ${turno?.clienteNombre}: ${formatearMoneda(aCobrar)}`
        : `Venta registrada por ${formatearMoneda(aCobrar)}`)
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
            {opciones.map((opcion) => {
              const { producto } = opcion
              const sinStock = producto.controlaStock && producto.stock < opcion.unidades
              return (
                <button
                  key={opcion.clave}
                  type="button"
                  disabled={sinStock}
                  onClick={() => sumar(opcion.clave)}
                  className={sinStock
                    ? 'cursor-not-allowed rounded-md border border-rp-border bg-rp-surface-2 p-2 text-left opacity-50'
                    : 'rounded-md border border-rp-border bg-rp-surface p-2 text-left transition hover:border-rp-accent'}
                >
                  <p className="truncate text-sm font-bold text-rp-text">{opcion.etiqueta}</p>
                  <p className="text-xs text-rp-accent">{formatearMoneda(opcion.precio)}</p>
                  <p className="text-[10px] text-rp-muted">
                    {nombreCategoria(producto.categoria)}
                    {/* Cuántas saca del depósito: es lo que explica por qué el tubo baja
                        el stock de a tres. */}
                    {opcion.unidades > 1 ? ` · ${opcion.unidades} u.` : ''}
                    {producto.controlaStock ? ` · ${sinStock ? 'sin stock' : `quedan ${producto.stock}`}` : ''}
                  </p>
                </button>
              )
            })}
          </div>
        )}

        <div className="rounded-md border border-rp-border bg-rp-surface-2 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-rp-muted">
            <ShoppingCart size={14} />Detalle
          </p>
          {Object.keys(carrito).length === 0 ? (
            <p className="text-sm text-rp-muted">Todavía no agregaste nada.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {Object.entries(carrito).map(([clave, cantidad]) => {
                const opcion = porClave.get(clave)
                if (!opcion) return null
                return (
                  <div key={clave} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm text-rp-text">{opcion.etiqueta}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <button type="button" onClick={() => restar(clave)} className="flex size-9 items-center justify-center rounded-md border border-rp-border text-rp-muted hover:text-rp-danger lg:size-7" aria-label={`Quitar uno de ${opcion.etiqueta}`}><Minus size={13} /></button>
                      <span className="w-6 text-center text-sm font-bold text-rp-text">{cantidad}</span>
                      <button type="button" onClick={() => sumar(clave)} className="flex size-9 items-center justify-center rounded-md border border-rp-border text-rp-muted hover:text-rp-accent lg:size-7" aria-label={`Agregar uno de ${opcion.etiqueta}`}><Plus size={13} /></button>
                      <span className="w-24 text-right text-sm font-bold text-rp-text">
                        {formatearMoneda(opcion.precio * cantidad)}
                      </span>
                    </div>
                  </div>
                )
              })}
              {aBonificar > 0 && (
                <div className="mt-2 flex items-center justify-between border-t border-rp-border pt-2 text-sm">
                  <span className="text-rp-muted">Subtotal</span>
                  <span className="text-rp-muted">{formatearMoneda(total)}</span>
                </div>
              )}
              <div className={`flex items-center justify-between ${aBonificar > 0 ? 'pt-1' : 'mt-2 border-t border-rp-border pt-2'}`}>
                <span className="text-sm font-bold text-rp-muted">
                  {aBonificar > 0 ? 'A cobrar' : 'Total'}
                </span>
                <span className="text-xl font-black text-rp-accent">{formatearMoneda(aCobrar)}</span>
              </div>
            </div>
          )}
        </div>

        {/* El descuento es un importe y no un porcentaje porque el mostrador redondea
            ("quedate con cinco mil"), no calcula. */}
        {Object.keys(carrito).length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Descuento"
              value={descuento}
              onChange={(e) => setDescuento(e.target.value)}
              placeholder="0"
            />
            <Input
              label="Por qué"
              value={motivoDescuento}
              onChange={(e) => setMotivoDescuento(e.target.value)}
              placeholder="Cliente de siempre"
              disabled={aBonificar <= 0}
            />
          </div>
        )}

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
              : `${medio === 'CUENTA' ? 'Anotar' : 'Cobrar'} ${formatearMoneda(aCobrar)}`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
