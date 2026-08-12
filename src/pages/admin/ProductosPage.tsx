import { AlertTriangle, History, Package, PackagePlus, Pencil, Plus, Scale, Trash2, Truck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { MEDIOS, type MedioPago } from '@/features/caja/cajaApi'
import {
  CATEGORIAS_PRODUCTO, MOTIVOS_STOCK, productosApi, proveedoresApi,
  type CategoriaProducto, type MovimientoStockResponse, type ProductoResponse, type ProveedorResponse,
} from '@/features/ventas/ventasApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { fechaISO, formatearFechaHora, formatearMoneda } from '@/shared/lib/formatters'
import { AdminPageHeader } from '@/shared/ui/AdminPageHeader'
import { AdminTable, type Column } from '@/shared/ui/AdminTable'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { SegmentedToggle } from '@/shared/ui/SegmentedToggle'
import { Select } from '@/shared/ui/Select'
import { TelefonoWhatsApp } from '@/shared/ui/TelefonoWhatsApp'
import { useToast } from '@/shared/ui/Toast'

/** Los montos se escriben como texto y se limpian al enviar. */
function aNumero(valor: string): number | null {
  const limpio = valor.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  if (!limpio) return null
  const numero = Number(limpio)
  return Number.isFinite(numero) ? numero : null
}

function nombreCategoria(categoria: string) {
  return CATEGORIAS_PRODUCTO.find((c) => c.valor === categoria)?.nombre ?? categoria
}

const PRODUCTO_VACIO = {
  nombre: '',
  categoria: 'PELOTAS' as CategoriaProducto,
  precioVenta: '',
  costo: '',
  controlaStock: true,
  stockInicial: '',
  stockMinimo: '',
  proveedorId: '',
}

const COMPRA_VACIA = { cantidad: '', costoUnitario: '', medioPago: 'EFECTIVO' as MedioPago, registraGasto: true, fecha: fechaISO() }

export default function ProductosPage() {
  const { success: avisoExito } = useToast()
  const [pestana, setPestana] = useState('productos')
  const [productos, setProductos] = useState<ProductoResponse[]>([])
  const [proveedores, setProveedores] = useState<ProveedorResponse[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalProducto, setModalProducto] = useState(false)
  const [editando, setEditando] = useState<ProductoResponse | null>(null)
  const [formProducto, setFormProducto] = useState({ ...PRODUCTO_VACIO })
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [aDarDeBaja, setADarDeBaja] = useState<ProductoResponse | null>(null)

  const [productoStock, setProductoStock] = useState<ProductoResponse | null>(null)
  const [accionStock, setAccionStock] = useState<'compra' | 'ajuste' | 'merma'>('compra')
  const [formCompra, setFormCompra] = useState({ ...COMPRA_VACIA })
  const [stockReal, setStockReal] = useState('')
  const [notasStock, setNotasStock] = useState('')
  const [guardandoStock, setGuardandoStock] = useState(false)
  const [errorStock, setErrorStock] = useState<string | null>(null)

  const [historial, setHistorial] = useState<MovimientoStockResponse[] | null>(null)
  const [productoHistorial, setProductoHistorial] = useState<ProductoResponse | null>(null)
  const [compras, setCompras] = useState<MovimientoStockResponse[]>([])

  const [modalProveedor, setModalProveedor] = useState(false)
  const [editandoProveedor, setEditandoProveedor] = useState<ProveedorResponse | null>(null)
  const [proveedorADarDeBaja, setProveedorADarDeBaja] = useState<ProveedorResponse | null>(null)
  const [formProveedor, setFormProveedor] = useState({ nombre: '', telefono: '', notas: '' })

  function cargar() {
    setCargando(true)
    Promise.all([productosApi.getAll(busqueda, false), proveedoresApi.getAll(false), productosApi.compras()])
      .then(([listaProductos, listaProveedores, listaCompras]) => {
        setProductos(listaProductos)
        setProveedores(listaProveedores)
        setCompras(listaCompras)
        setError(null)
      })
      .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
      .finally(() => setCargando(false))
  }

  // La búsqueda pega al servidor con un respiro, para no disparar una consulta por tecla.
  useEffect(() => {
    const id = setTimeout(cargar, 300)
    return () => clearTimeout(id)
  }, [busqueda])

  const aReponer = useMemo(() => productos.filter((p) => p.necesitaReposicion), [productos])
  const proveedoresActivos = useMemo(() => proveedores.filter((p) => p.activo), [proveedores])

  function abrirCrear() {
    setEditando(null)
    setFormProducto({ ...PRODUCTO_VACIO })
    setErrorForm(null)
    setModalProducto(true)
  }

  function abrirEditar(producto: ProductoResponse) {
    setEditando(producto)
    setFormProducto({
      nombre: producto.nombre,
      categoria: producto.categoria,
      precioVenta: String(producto.precioVenta),
      costo: producto.costo != null ? String(producto.costo) : '',
      controlaStock: producto.controlaStock,
      stockInicial: '',
      stockMinimo: String(producto.stockMinimo),
      proveedorId: producto.proveedorId != null ? String(producto.proveedorId) : '',
    })
    setErrorForm(null)
    setModalProducto(true)
  }

  async function guardarProducto() {
    if (!formProducto.nombre.trim()) { setErrorForm('Poné el nombre del producto.'); return }
    const precio = aNumero(formProducto.precioVenta)
    if (precio == null || precio <= 0) { setErrorForm('Ingresá un precio de venta válido.'); return }

    setGuardando(true); setErrorForm(null)
    try {
      const cuerpo = {
        nombre: formProducto.nombre.trim(),
        categoria: formProducto.categoria,
        precioVenta: precio,
        costo: aNumero(formProducto.costo),
        controlaStock: formProducto.controlaStock,
        stockInicial: formProducto.controlaStock ? (aNumero(formProducto.stockInicial) ?? 0) : 0,
        stockMinimo: aNumero(formProducto.stockMinimo) ?? 0,
        proveedorId: formProducto.proveedorId ? Number(formProducto.proveedorId) : null,
      }
      if (editando) await productosApi.update(editando.id, cuerpo)
      else await productosApi.create(cuerpo)
      setModalProducto(false)
      cargar()
      avisoExito(editando ? 'Producto actualizado' : 'Producto creado')
    } catch (e: unknown) {
      setErrorForm(obtenerMensajeErrorApi(e))
    } finally { setGuardando(false) }
  }

  async function darDeBaja() {
    if (!aDarDeBaja) return
    try {
      await productosApi.remove(aDarDeBaja.id)
      setADarDeBaja(null)
      cargar()
      avisoExito('Producto dado de baja')
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e)); setADarDeBaja(null)
    }
  }

  async function darDeBajaProveedor() {
    if (!proveedorADarDeBaja) return
    try {
      await proveedoresApi.remove(proveedorADarDeBaja.id)
      setProveedorADarDeBaja(null)
      cargar()
      avisoExito('Proveedor dado de baja')
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e)); setProveedorADarDeBaja(null)
    }
  }

  function abrirStock(producto: ProductoResponse, accion: 'compra' | 'ajuste' | 'merma') {
    setProductoStock(producto)
    setAccionStock(accion)
    setFormCompra({ ...COMPRA_VACIA, costoUnitario: producto.costo != null ? String(producto.costo) : '' })
    setStockReal(String(producto.stock))
    setNotasStock('')
    setErrorStock(null)
  }

  async function guardarStock() {
    if (!productoStock) return
    setGuardandoStock(true); setErrorStock(null)
    try {
      if (accionStock === 'compra') {
        const cantidad = aNumero(formCompra.cantidad)
        if (cantidad == null || cantidad <= 0) { setErrorStock('Ingresá cuántas unidades entraron.'); setGuardandoStock(false); return }
        const costo = aNumero(formCompra.costoUnitario)
        await productosApi.comprar(productoStock.id, {
          cantidad,
          costoUnitario: costo,
          // Sin medio de pago no se registra el egreso: sirve para cargar mercadería que
          // ya estaba paga o que se anotó como gasto por otro lado.
          medioPago: formCompra.registraGasto && costo != null ? formCompra.medioPago : null,
          fecha: formCompra.fecha,
          notas: notasStock.trim() || null,
        })
      } else if (accionStock === 'ajuste') {
        const real = aNumero(stockReal)
        if (real == null || real < 0) { setErrorStock('Ingresá cuántas unidades contaste.'); setGuardandoStock(false); return }
        await productosApi.ajustar(productoStock.id, real, notasStock.trim() || null)
      } else {
        const cantidad = aNumero(formCompra.cantidad)
        if (cantidad == null || cantidad <= 0) { setErrorStock('Ingresá cuántas unidades se perdieron.'); setGuardandoStock(false); return }
        await productosApi.registrarMerma(productoStock.id, { cantidad, notas: notasStock.trim() || null })
      }
      setProductoStock(null)
      cargar()
      avisoExito('Stock actualizado')
    } catch (e: unknown) {
      setErrorStock(obtenerMensajeErrorApi(e))
    } finally { setGuardandoStock(false) }
  }

  function abrirHistorial(producto: ProductoResponse) {
    setProductoHistorial(producto)
    setHistorial(null)
    productosApi.movimientos(producto.id).then(setHistorial).catch(() => setHistorial([]))
  }

  async function guardarProveedor() {
    if (!formProveedor.nombre.trim()) return
    try {
      const cuerpo = {
        nombre: formProveedor.nombre.trim(),
        telefono: formProveedor.telefono.trim() || null,
        notas: formProveedor.notas.trim() || null,
      }
      if (editandoProveedor) await proveedoresApi.update(editandoProveedor.id, cuerpo)
      else await proveedoresApi.create(cuerpo)
      setModalProveedor(false)
      cargar()
      avisoExito(editandoProveedor ? 'Proveedor actualizado' : 'Proveedor agregado')
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    }
  }

  const columnasProductos = useMemo(() => [
    {
      key: 'producto',
      label: 'Producto',
      render: (producto: ProductoResponse) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-rp-text">{producto.nombre}</span>
            {!producto.activo && (
              <span className="rounded-full bg-rp-surface-2 px-2 py-0.5 text-[10px] font-bold text-rp-muted">De baja</span>
            )}
          </div>
          <p className="text-xs text-rp-muted">
            {nombreCategoria(producto.categoria)}
            {producto.proveedorNombre ? ` · ${producto.proveedorNombre}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'precio',
      label: 'Precio',
      render: (producto: ProductoResponse) => (
        <div>
          <p className="text-sm font-bold text-rp-text">{formatearMoneda(producto.precioVenta)}</p>
          <p className="text-xs text-rp-muted">
            {producto.margenUnitario != null
              ? `Gana ${formatearMoneda(producto.margenUnitario)}`
              : 'Sin costo cargado'}
          </p>
        </div>
      ),
    },
    {
      key: 'stock',
      label: 'Stock',
      render: (producto: ProductoResponse) => {
        if (!producto.controlaStock) {
          return <span className="text-xs text-rp-muted">Sin control</span>
        }
        return (
          <div>
            <p className={`text-sm font-bold ${producto.necesitaReposicion ? 'text-rp-danger' : 'text-rp-text'}`}>
              {producto.stock} {producto.stock === 1 ? 'unidad' : 'unidades'}
            </p>
            {producto.stockMinimo > 0 && (
              <p className="text-xs text-rp-muted">Reponer con {producto.stockMinimo} o menos</p>
            )}
          </div>
        )
      },
    },
  ] as Column<ProductoResponse>[], [])

  const columnasCompras = useMemo(() => [
    {
      key: 'fecha',
      label: 'Cuándo',
      render: (compra: MovimientoStockResponse) => (
        <span className="text-sm text-rp-text">{formatearFechaHora(compra.fecha)}</span>
      ),
    },
    {
      key: 'producto',
      label: 'Producto',
      render: (compra: MovimientoStockResponse) => (
        <span className="text-sm font-bold text-rp-text">{compra.productoNombre}</span>
      ),
    },
    {
      key: 'cantidad',
      label: 'Unidades',
      render: (compra: MovimientoStockResponse) => (
        <span className="text-sm font-bold text-rp-accent">+{compra.cantidad}</span>
      ),
    },
    {
      key: 'costo',
      label: 'Costo unitario',
      render: (compra: MovimientoStockResponse) => (
        <span className="text-sm text-rp-text">
          {compra.costoUnitario != null ? formatearMoneda(compra.costoUnitario) : '—'}
        </span>
      ),
    },
    {
      key: 'total',
      label: 'Total',
      render: (compra: MovimientoStockResponse) => (
        <span className="text-sm font-bold text-rp-text">
          {compra.costoUnitario != null ? formatearMoneda(compra.costoUnitario * compra.cantidad) : '—'}
        </span>
      ),
    },
    {
      key: 'notas',
      label: 'Detalle',
      render: (compra: MovimientoStockResponse) => (
        <span className="text-xs text-rp-muted">{compra.notas ?? compra.registradoPor ?? ''}</span>
      ),
    },
  ] as Column<MovimientoStockResponse>[], [])

  const columnasProveedores = useMemo(() => [
    {
      key: 'proveedor',
      label: 'Proveedor',
      render: (proveedor: ProveedorResponse) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-rp-text">{proveedor.nombre}</span>
            {!proveedor.activo && (
              <span className="rounded-full bg-rp-surface-2 px-2 py-0.5 text-[10px] font-bold text-rp-muted">De baja</span>
            )}
          </div>
          <TelefonoWhatsApp telefono={proveedor.telefono} mensaje={`Hola! Te escribo del club.`} />
        </div>
      ),
    },
    {
      key: 'productos',
      label: 'Le compramos',
      render: (proveedor: ProveedorResponse) => (
        <span className="text-sm text-rp-muted">
          {proveedor.productos === 1 ? '1 producto' : `${proveedor.productos} productos`}
        </span>
      ),
    },
    {
      key: 'notas',
      label: 'Notas',
      render: (proveedor: ProveedorResponse) => (
        <span className="text-xs text-rp-muted">{proveedor.notas ?? '-'}</span>
      ),
    },
  ] as Column<ProveedorResponse>[], [])

  return (
    <section>
      <AdminPageHeader
        title={<><Package size={26} />Productos</>}
        action={pestana === 'productos'
          ? <Button size="sm" onClick={abrirCrear}><Plus size={16} />Nuevo producto</Button>
          : pestana === 'proveedores'
            ? <Button size="sm" onClick={() => { setEditandoProveedor(null); setFormProveedor({ nombre: '', telefono: '', notas: '' }); setModalProveedor(true) }}><Plus size={16} />Nuevo proveedor</Button>
            : null}
      />

      <p className="mt-3 max-w-2xl text-sm text-rp-muted">
        Lo que el club vende en el mostrador: pelotas, bebidas, alquiler de paletas. Cada venta
        entra a la caja del día y descuenta el stock sola.
      </p>

      {aReponer.length > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rp-danger" />
          <p className="text-sm text-rp-text">
            <b className="text-rp-danger">Hay que reponer:</b>{' '}
            {aReponer.map((p) => `${p.nombre} (${p.stock})`).join(', ')}
          </p>
        </div>
      )}

      <SegmentedToggle
        className="mt-5"
        valor={pestana}
        onChange={setPestana}
        opciones={[
          { valor: 'productos', label: 'Productos y stock' },
          { valor: 'compras', label: 'Compras' },
          { valor: 'proveedores', label: 'Proveedores' },
        ]}
      />

      {pestana === 'compras' ? (
        <div className="mt-4">
          <p className="mb-3 max-w-2xl text-sm text-rp-muted">
            Toda la mercadería que entró, de todos los productos. Las compras que cargaste con
            medio de pago además figuran como gasto en la rentabilidad.
          </p>
          <AdminTable
            columns={columnasCompras}
            rows={compras}
            getRowKey={(compra) => compra.id}
            isLoading={cargando}
            error={error}
            emptyTitle="Todavía no cargaste ninguna compra"
            emptyDescription="Usá el botón de mercadería en la lista de productos cuando entre algo."
          />
        </div>
      ) : pestana === 'productos' ? (
        <>
          <div className="mt-4 w-full sm:w-72">
            <Input placeholder="Buscar producto..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <div className="mt-4">
            <AdminTable
              columns={columnasProductos}
              rows={productos}
              getRowKey={(producto) => producto.id}
              isLoading={cargando}
              error={error}
              emptyTitle="Todavía no hay productos"
              emptyDescription="Cargá lo que vendés en el mostrador para que entre a la caja."
              actions={(producto) => (
                <>
                  {producto.controlaStock && (
                    <>
                      <button onClick={() => abrirStock(producto, 'compra')} className="flex size-11 items-center justify-center rounded-md lg:size-8 text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent" aria-label="Cargar compra" title="Entró mercadería"><PackagePlus size={15} /></button>
                      <button onClick={() => abrirStock(producto, 'ajuste')} className="flex size-11 items-center justify-center rounded-md lg:size-8 text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent" aria-label="Ajustar stock" title="Contar y corregir"><Scale size={15} /></button>
                      <button onClick={() => abrirHistorial(producto)} className="flex size-11 items-center justify-center rounded-md lg:size-8 text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent" aria-label="Ver movimientos" title="Movimientos de stock"><History size={15} /></button>
                    </>
                  )}
                  <button onClick={() => abrirEditar(producto)} className="flex size-11 items-center justify-center rounded-md lg:size-8 text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent" aria-label="Editar"><Pencil size={15} /></button>
                  {producto.activo && (
                    <button onClick={() => setADarDeBaja(producto)} className="flex size-11 items-center justify-center rounded-md lg:size-8 text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger" aria-label="Dar de baja" title="Dar de baja"><Trash2 size={15} /></button>
                  )}
                </>
              )}
            />
          </div>
        </>
      ) : (
        <div className="mt-4">
          <AdminTable
            columns={columnasProveedores}
            rows={proveedores}
            getRowKey={(proveedor) => proveedor.id}
            isLoading={cargando}
            error={error}
            emptyTitle="Todavía no hay proveedores"
            emptyDescription="Cargalos para tener a mano a quién pedirle cuando falte algo."
            actions={(proveedor) => (
              <>
                <button
                  onClick={() => {
                    setEditandoProveedor(proveedor)
                    setFormProveedor({ nombre: proveedor.nombre, telefono: proveedor.telefono ?? '', notas: proveedor.notas ?? '' })
                    setModalProveedor(true)
                  }}
                  className="flex size-11 items-center justify-center rounded-md lg:size-8 text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent"
                  aria-label="Editar"
                ><Pencil size={15} /></button>
                {proveedor.activo && (
                  <button
                    onClick={() => setProveedorADarDeBaja(proveedor)}
                    className="flex size-11 items-center justify-center rounded-md lg:size-8 text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger"
                    aria-label="Dar de baja"
                    title="Dar de baja"
                  ><Trash2 size={15} /></button>
                )}
              </>
            )}
          />
        </div>
      )}

      <Modal isOpen={modalProducto} onClose={() => setModalProducto(false)} onSubmit={guardarProducto} title={editando ? 'Editar producto' : 'Nuevo producto'} size="sm">
        <div className="flex flex-col gap-4">
          <Input label="Nombre" value={formProducto.nombre} onChange={(e) => setFormProducto((f) => ({ ...f, nombre: e.target.value }))} placeholder="Pelotas Head" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Rubro" value={formProducto.categoria} onChange={(e) => setFormProducto((f) => ({ ...f, categoria: e.target.value as CategoriaProducto }))}>
              {CATEGORIAS_PRODUCTO.map((c) => <option key={c.valor} value={c.valor}>{c.nombre}</option>)}
            </Select>
            <Select label="Proveedor" value={formProducto.proveedorId} onChange={(e) => setFormProducto((f) => ({ ...f, proveedorId: e.target.value }))}>
              <option value="">Sin proveedor</option>
              {proveedoresActivos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Precio de venta" value={formProducto.precioVenta} onChange={(e) => setFormProducto((f) => ({ ...f, precioVenta: e.target.value }))} placeholder="18000" />
            <Input label="Costo" value={formProducto.costo} onChange={(e) => setFormProducto((f) => ({ ...f, costo: e.target.value }))} placeholder="12000" />
          </div>
          <p className="-mt-2 text-[11px] text-rp-muted">El costo es lo que te sale a vos. Sirve para saber cuánto ganás con cada uno.</p>

          <label className="flex items-center gap-2 text-sm text-rp-text">
            <input
              type="checkbox"
              checked={formProducto.controlaStock}
              onChange={(e) => setFormProducto((f) => ({ ...f, controlaStock: e.target.checked }))}
              className="size-4 accent-[var(--rp-accent)]"
            />
            Llevar control de unidades
          </label>
          <p className="-mt-2 text-[11px] text-rp-muted">
            Desmarcalo para lo que no se acaba, como el alquiler de una paleta o un café.
          </p>

          {formProducto.controlaStock && (
            <div className="grid grid-cols-2 gap-3">
              {!editando && (
                <Input label="Unidades que hay" value={formProducto.stockInicial} onChange={(e) => setFormProducto((f) => ({ ...f, stockInicial: e.target.value }))} placeholder="10" />
              )}
              <Input label="Avisar al llegar a" value={formProducto.stockMinimo} onChange={(e) => setFormProducto((f) => ({ ...f, stockMinimo: e.target.value }))} placeholder="3" />
            </div>
          )}

          {errorForm && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorForm}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setModalProducto(false)} disabled={guardando}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(productoStock)}
        onClose={() => setProductoStock(null)}
        onSubmit={guardarStock}
        title={accionStock === 'compra' ? 'Entró mercadería' : accionStock === 'ajuste' ? 'Contar y corregir' : 'Registrar pérdida'}
        size="sm"
      >
        {productoStock && (
          <div className="flex flex-col gap-4">
            <div className="rounded-md border border-rp-border bg-rp-surface-2 px-3 py-2">
              <p className="text-sm font-bold text-rp-text">{productoStock.nombre}</p>
              <p className="text-xs text-rp-muted">El sistema tiene {productoStock.stock} unidades.</p>
            </div>

            {accionStock === 'ajuste' ? (
              <>
                <Input label="Unidades que contaste" value={stockReal} onChange={(e) => setStockReal(e.target.value)} placeholder="7" />
                <p className="-mt-2 text-[11px] text-rp-muted">Se guarda la diferencia con lo que decía el sistema.</p>
              </>
            ) : (
              <Input
                label={accionStock === 'compra' ? 'Unidades que entraron' : 'Unidades perdidas'}
                value={formCompra.cantidad}
                onChange={(e) => setFormCompra((f) => ({ ...f, cantidad: e.target.value }))}
                placeholder="12"
              />
            )}

            {accionStock === 'compra' && (
              <>
                <Input label="Costo de cada unidad" value={formCompra.costoUnitario} onChange={(e) => setFormCompra((f) => ({ ...f, costoUnitario: e.target.value }))} placeholder="13500" />
                <label className="flex items-center gap-2 text-sm text-rp-text">
                  <input
                    type="checkbox"
                    checked={formCompra.registraGasto}
                    onChange={(e) => setFormCompra((f) => ({ ...f, registraGasto: e.target.checked }))}
                    className="size-4 accent-[var(--rp-accent)]"
                  />
                  Registrar también el gasto
                </label>
                {formCompra.registraGasto && (
                  <div className="grid grid-cols-2 gap-3">
                    <Select label="Cómo se pagó" value={formCompra.medioPago} onChange={(e) => setFormCompra((f) => ({ ...f, medioPago: e.target.value as MedioPago }))}>
                      {MEDIOS.map((m) => <option key={m.valor} value={m.valor}>{m.nombre}</option>)}
                    </Select>
                    <Input label="Fecha" type="date" value={formCompra.fecha} onChange={(e) => setFormCompra((f) => ({ ...f, fecha: e.target.value }))} />
                  </div>
                )}
              </>
            )}

            <Input label="Notas" value={notasStock} onChange={(e) => setNotasStock(e.target.value)} placeholder="Remito 4521" />
            {errorStock && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorStock}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setProductoStock(null)} disabled={guardandoStock}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={guardandoStock}>{guardandoStock ? 'Guardando...' : 'Guardar'}</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={Boolean(productoHistorial)} onClose={() => setProductoHistorial(null)} title={`Movimientos · ${productoHistorial?.nombre ?? ''}`} size="md">
        {historial == null ? (
          <p className="text-sm text-rp-muted">Cargando...</p>
        ) : historial.length === 0 ? (
          <p className="text-sm text-rp-muted">Este producto todavía no tuvo movimientos.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {historial.map((movimiento) => (
              <div key={movimiento.id} className="flex items-center justify-between gap-3 border-b border-rp-border py-2 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-rp-text">{MOTIVOS_STOCK[movimiento.motivo] ?? movimiento.motivo}</p>
                  <p className="text-xs text-rp-muted">
                    {formatearFechaHora(movimiento.fecha)}
                    {movimiento.registradoPor ? ` · ${movimiento.registradoPor}` : ''}
                  </p>
                  {movimiento.notas && <p className="text-xs italic text-rp-muted">{movimiento.notas}</p>}
                </div>
                <span className={`shrink-0 text-sm font-black ${movimiento.cantidad < 0 ? 'text-rp-danger' : 'text-rp-accent'}`}>
                  {movimiento.cantidad > 0 ? '+' : ''}{movimiento.cantidad}
                </span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal isOpen={modalProveedor} onClose={() => setModalProveedor(false)} onSubmit={guardarProveedor} title={editandoProveedor ? 'Editar proveedor' : 'Nuevo proveedor'} size="sm">
        <div className="flex flex-col gap-4">
          <Input label="Nombre" value={formProveedor.nombre} onChange={(e) => setFormProveedor((f) => ({ ...f, nombre: e.target.value }))} placeholder="Distribuidora Central" />
          <Input label="Teléfono" value={formProveedor.telefono} onChange={(e) => setFormProveedor((f) => ({ ...f, telefono: e.target.value }))} placeholder="385..." />
          <Input label="Notas" value={formProveedor.notas} onChange={(e) => setFormProveedor((f) => ({ ...f, notas: e.target.value }))} placeholder="Entrega los martes" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setModalProveedor(false)}>Cancelar</Button>
            <Button type="submit" size="sm"><Truck size={15} />Guardar</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(aDarDeBaja)}
        onClose={() => setADarDeBaja(null)}
        onConfirm={darDeBaja}
        title="Dar de baja el producto"
        description={`"${aDarDeBaja?.nombre ?? ''}" deja de aparecer para vender, pero sigue en las ventas ya hechas.`}
      />

      <ConfirmDialog
        isOpen={Boolean(proveedorADarDeBaja)}
        onClose={() => setProveedorADarDeBaja(null)}
        onConfirm={darDeBajaProveedor}
        title="Dar de baja el proveedor"
        description={`"${proveedorADarDeBaja?.nombre ?? ''}" deja de aparecer al cargar compras, pero las compras ya hechas no se tocan.`}
      />
    </section>
  )
}
