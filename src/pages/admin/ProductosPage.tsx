import { AlertTriangle, FileText, History, Package, PackagePlus, Pencil, Plus, Scale, Trash2, Truck, Wallet } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { MEDIOS, type MedioPago } from '@/features/caja/cajaApi'
import { TIPOS_COMPROBANTE, comprasApi, type CompraResponse } from '@/features/ventas/comprasApi'
import {
  CATEGORIAS_PRODUCTO, MOTIVOS_STOCK, productosApi, proveedoresApi,
  type CategoriaProducto, type MovimientoStockResponse, type PresentacionResponse,
  type ProductoResponse, type ProveedorResponse,
} from '@/features/ventas/ventasApi'
import { authApi } from '@/features/auth/authApi'
import { reservasApi } from '@/features/reservas/reservasApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { fechaISO, formatearFecha, formatearFechaHora, formatearMoneda } from '@/shared/lib/formatters'
import { aNumero } from '@/shared/lib/numeros'
import { AdminPageHeader } from '@/shared/ui/AdminPageHeader'
import { AdminTable, type Column } from '@/shared/ui/AdminTable'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Pagination } from '@/shared/ui/Pagination'
import { SegmentedToggle } from '@/shared/ui/SegmentedToggle'
import { Select } from '@/shared/ui/Select'
import { TelefonoWhatsApp } from '@/shared/ui/TelefonoWhatsApp'
import { useToast } from '@/shared/ui/Toast'
import { CompraModal } from '@/pages/admin/CompraModal'
import { CuentaProveedorModal } from '@/pages/admin/CuentaProveedorModal'
import { RecuentoPanel } from '@/pages/admin/RecuentoPanel'

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

// Sin `fecha`: se completa al abrir el modal con la jornada del club. Como constante de
// módulo quedaba congelada en el día en que se cargó la pantalla, y una compra anotada
// después de medianoche caía en un día distinto al del arqueo que le descuenta la plata.
const COMPRA_VACIA = { cantidad: '', costoUnitario: '', medioPago: 'EFECTIVO' as MedioPago, registraGasto: true, fecha: '' }

const COMPROBANTES_POR_PAGINA = 20
const MOVIMIENTOS_POR_PAGINA = 25

function nombreComprobante(tipo: string) {
  return TIPOS_COMPROBANTE.find((t) => t.valor === tipo)?.nombre ?? tipo
}

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

  /**
   * Jornada del club, que después de medianoche sigue siendo la de ayer. Es la fecha con
   * la que se propone una compra: si el pago sale del cajón, tiene que descontarse del
   * arqueo de esa noche. Arranca en hoy y se corrige apenas responde el backend.
   */
  const [jornada, setJornada] = useState(fechaISO())

  const [productoStock, setProductoStock] = useState<ProductoResponse | null>(null)
  const [accionStock, setAccionStock] = useState<'compra' | 'ajuste' | 'merma'>('compra')
  const [formCompra, setFormCompra] = useState({ ...COMPRA_VACIA })
  const [stockReal, setStockReal] = useState('')
  const [notasStock, setNotasStock] = useState('')
  const [guardandoStock, setGuardandoStock] = useState(false)
  const [errorStock, setErrorStock] = useState<string | null>(null)

  const [historial, setHistorial] = useState<MovimientoStockResponse[] | null>(null)
  const [productoHistorial, setProductoHistorial] = useState<ProductoResponse | null>(null)
  const [paginaHistorial, setPaginaHistorial] = useState(1)
  const [totalHistorial, setTotalHistorial] = useState(0)
  const [compras, setCompras] = useState<MovimientoStockResponse[]>([])

  // Los comprobantes cargados, que es distinto de las entradas sueltas de la tabla de
  // arriba: un remito de doce productos es UN comprobante y doce entradas.
  const [comprobantes, setComprobantes] = useState<CompraResponse[]>([])
  const [totalComprobantes, setTotalComprobantes] = useState(0)
  const [paginaComprobantes, setPaginaComprobantes] = useState(1)
  const [modalCompra, setModalCompra] = useState(false)
  const [compraAAnular, setCompraAAnular] = useState<CompraResponse | null>(null)
  const [cuentaDe, setCuentaDe] = useState<ProveedorResponse | null>(null)

  // El alta y la edición de packs, desde la ficha del producto.
  const [presentacionAbierta, setPresentacionAbierta] = useState<{
    producto: ProductoResponse
    presentacion: PresentacionResponse | null
  } | null>(null)
  const [formPresentacion, setFormPresentacion] = useState({ nombre: '', unidades: '', precioVenta: '' })
  const [guardandoPresentacion, setGuardandoPresentacion] = useState(false)
  const [errorPresentacion, setErrorPresentacion] = useState<string | null>(null)

  const [modalProveedor, setModalProveedor] = useState(false)
  const [editandoProveedor, setEditandoProveedor] = useState<ProveedorResponse | null>(null)
  const [proveedorADarDeBaja, setProveedorADarDeBaja] = useState<ProveedorResponse | null>(null)
  const [formProveedor, setFormProveedor] = useState({ nombre: '', telefono: '', notas: '' })

  useEffect(() => {
    let vigente = true
    reservasApi.jornadaActual()
      .then((fecha) => { if (vigente) setJornada(fecha) })
      .catch(() => undefined)
    return () => { vigente = false }
  }, [])

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

  const cargarComprobantes = useCallback(() => {
    comprasApi.listar(null, paginaComprobantes - 1, COMPROBANTES_POR_PAGINA)
      .then((pagina) => { setComprobantes(pagina.contenido); setTotalComprobantes(pagina.totalElementos) })
      .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
  }, [paginaComprobantes])

  // Solo cuando la solapa está a la vista: el mostrador no puede pedirlos y recibiría un 403.
  useEffect(() => {
    if (pestana !== 'compras') return
    cargarComprobantes()
  }, [pestana, cargarComprobantes])

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

  async function anularCompra(motivo: string) {
    if (!compraAAnular) return
    try {
      await comprasApi.anular(compraAAnular.id, motivo)
      setCompraAAnular(null)
      cargar()
      cargarComprobantes()
      avisoExito('Compra anulada. El stock volvió como estaba.')
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e)); setCompraAAnular(null)
    }
  }

  function abrirStock(producto: ProductoResponse, accion: 'compra' | 'ajuste' | 'merma') {
    setProductoStock(producto)
    setAccionStock(accion)
    setFormCompra({
      ...COMPRA_VACIA,
      // La jornada del club: una compra pagada del cajón a la 1 AM tiene que pesar en el
      // arqueo de esa noche, que es de donde salió la plata.
      fecha: jornada,
      costoUnitario: producto.costo != null ? String(producto.costo) : '',
    })
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
    setPaginaHistorial(1)
  }

  // El kardex se pide cuando se abre la ficha y cada vez que se pasa de página. Antes
  // llegaban los últimos 40 y nada más: un faltante de hace dos meses era inalcanzable.
  useEffect(() => {
    if (!productoHistorial) return
    let vigente = true
    productosApi.movimientos(productoHistorial.id, paginaHistorial - 1, MOVIMIENTOS_POR_PAGINA)
      .then((pagina) => {
        if (!vigente) return
        setHistorial(pagina.contenido)
        setTotalHistorial(pagina.totalElementos)
      })
      .catch(() => { if (vigente) setHistorial([]) })
    return () => { vigente = false }
  }, [productoHistorial, paginaHistorial])

  function abrirPresentacion(producto: ProductoResponse, presentacion: PresentacionResponse | null) {
    setFormPresentacion(presentacion
      ? {
          nombre: presentacion.nombre,
          unidades: String(presentacion.unidades),
          precioVenta: String(presentacion.precioVenta),
        }
      : { nombre: '', unidades: '', precioVenta: '' })
    setErrorPresentacion(null)
    setPresentacionAbierta({ producto, presentacion })
  }

  /**
   * Después de tocar un pack hay que recargar la lista Y la ficha abierta: el modal
   * muestra el producto que está en memoria, y sin esto el pack recién creado no aparece
   * hasta cerrar y volver a abrir.
   */
  async function recargarConFicha(productoId: number) {
    const lista = await productosApi.getAll(busqueda, false)
    setProductos(lista)
    const actualizado = lista.find((p) => p.id === productoId)
    if (actualizado) setProductoHistorial(actualizado)
  }

  async function guardarPresentacion() {
    if (!presentacionAbierta) return
    const unidades = Number(formPresentacion.unidades)
    const precio = aNumero(formPresentacion.precioVenta)
    if (!formPresentacion.nombre.trim()) { setErrorPresentacion('Poné cómo se llama.'); return }
    if (!Number.isInteger(unidades) || unidades < 1) { setErrorPresentacion('Indicá cuántas unidades trae.'); return }
    if (precio == null || precio < 0) { setErrorPresentacion('Ingresá un precio válido.'); return }

    setGuardandoPresentacion(true); setErrorPresentacion(null)
    try {
      const cuerpo = { nombre: formPresentacion.nombre.trim(), unidades, precioVenta: precio }
      if (presentacionAbierta.presentacion) {
        await productosApi.actualizarPresentacion(presentacionAbierta.presentacion.id, cuerpo)
      } else {
        await productosApi.crearPresentacion(presentacionAbierta.producto.id, cuerpo)
      }
      await recargarConFicha(presentacionAbierta.producto.id)
      setPresentacionAbierta(null)
      avisoExito(presentacionAbierta.presentacion ? 'Pack actualizado' : 'Pack agregado')
    } catch (e: unknown) {
      setErrorPresentacion(obtenerMensajeErrorApi(e))
    } finally { setGuardandoPresentacion(false) }
  }

  async function darDeBajaPresentacion(presentacionId: number) {
    if (!productoHistorial) return
    try {
      await productosApi.darDeBajaPresentacion(presentacionId)
      await recargarConFicha(productoHistorial.id)
      avisoExito('Pack dado de baja')
    } catch (e: unknown) {
      setErrorPresentacion(obtenerMensajeErrorApi(e))
    }
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
            <button
              type="button"
              onClick={() => abrirHistorial(producto)}
              className="text-left text-sm font-bold text-rp-text underline decoration-rp-border underline-offset-2 transition hover:text-rp-accent"
            >
              {producto.nombre}
            </button>
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
      key: 'costo',
      label: 'Costo',
      render: (producto: ProductoResponse) => (
        <span className="text-sm text-rp-text">
          {producto.costo != null ? formatearMoneda(producto.costo) : '—'}
        </span>
      ),
    },
    {
      key: 'precio',
      label: 'Precio venta',
      render: (producto: ProductoResponse) => (
        <span className="text-sm font-bold text-rp-text">{formatearMoneda(producto.precioVenta)}</span>
      ),
    },
    {
      // Ganancia en columna propia y no como texto debajo del precio: es el número por el
      // que el dueño ordena la lista para decidir qué conviene tener.
      key: 'ganancia',
      label: 'Ganancia',
      render: (producto: ProductoResponse) => {
        if (producto.margenUnitario == null) {
          return <span className="text-xs text-rp-muted">Sin costo</span>
        }
        const porcentaje = producto.precioVenta > 0
          ? (producto.margenUnitario / producto.precioVenta) * 100
          : null
        return (
          <div>
            <p className="text-sm font-bold text-rp-accent">{formatearMoneda(producto.margenUnitario)}</p>
            {porcentaje != null && (
              <p className="text-xs text-rp-muted">{porcentaje.toFixed(1).replace('.', ',')} %</p>
            )}
          </div>
        )
      },
    },
    {
      key: 'stock',
      label: 'Stock',
      render: (producto: ProductoResponse) => {
        if (!producto.controlaStock) {
          return <span className="text-xs text-rp-muted">No controla</span>
        }
        return (
          <div>
            <p className={`text-sm font-bold ${producto.necesitaReposicion ? 'text-rp-danger' : 'text-rp-text'}`}>
              {producto.stock}
            </p>
            {producto.stockMinimo > 0 && (
              <p className="text-xs text-rp-muted">Mínimo {producto.stockMinimo}</p>
            )}
          </div>
        )
      },
    },
  ] as Column<ProductoResponse>[], [])

  const columnasComprobantes = useMemo(() => [
    {
      key: 'comprobante',
      label: 'Comprobante',
      render: (compra: CompraResponse) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-rp-text">
            {nombreComprobante(compra.tipoComprobante)} {compra.numero}
          </span>
          <span className="text-xs text-rp-muted">{formatearFecha(compra.fecha)}</span>
        </div>
      ),
    },
    {
      key: 'proveedor',
      label: 'Proveedor',
      render: (compra: CompraResponse) => (
        <span className="text-sm text-rp-text">{compra.proveedorNombre}</span>
      ),
    },
    {
      key: 'detalle',
      label: 'Qué entró',
      render: (compra: CompraResponse) => (
        <span className="text-xs text-rp-muted">
          {compra.items.map((item) => `${item.cantidad} x ${item.productoNombre}`).join(', ')}
        </span>
      ),
    },
    {
      key: 'total',
      label: 'Total',
      render: (compra: CompraResponse) => (
        <span className="text-sm font-bold text-rp-text">{formatearMoneda(compra.total)}</span>
      ),
    },
    {
      key: 'medio',
      label: 'Cómo se pagó',
      render: (compra: CompraResponse) => (
        compra.anuladoEn != null
          ? <span className="text-xs font-bold text-rp-danger">Anulada</span>
          : compra.quedaACuenta
            ? <span className="text-xs font-bold text-rp-accent">A cuenta</span>
            : <span className="text-xs text-rp-muted">{MEDIOS.find((m) => m.valor === compra.medio)?.nombre ?? compra.medio}</span>
      ),
    },
  ] as Column<CompraResponse>[], [])

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
        // Una compra anulada deja su compensatorio, que resta: el signo no puede ir fijo.
        <span className={`text-sm font-bold ${compra.cantidad < 0 ? 'text-rp-danger' : 'text-rp-accent'}`}>
          {compra.cantidad > 0 ? `+${compra.cantidad}` : compra.cantidad}
        </span>
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
            : pestana === 'compras'
              ? <Button size="sm" onClick={() => setModalCompra(true)}><Plus size={16} />Cargar compra</Button>
              // El conteo abre desde su propio panel: el botón ahí explica qué hace.
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
            <b className="text-rp-danger">Stock bajo mínimo:</b>{' '}
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
          { valor: 'conteo', label: 'Conteo' },
          { valor: 'proveedores', label: 'Proveedores' },
        ]}
      />

      {pestana === 'conteo' ? (
        <RecuentoPanel onAplicado={cargar} />
      ) : pestana === 'compras' ? (
        <div className="mt-4">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-rp-muted">
            <FileText size={15} />Comprobantes
          </h2>
          <p className="mb-3 mt-1 max-w-2xl text-sm text-rp-muted">
            Las compras cargadas como vino el papel: un comprobante con todos sus productos.
            Las que quedan a cuenta pesan igual en la rentabilidad del mes, pero la plata sale
            del cajón recién cuando le pagás al proveedor, desde su cuenta.
          </p>
          <AdminTable
            columns={columnasComprobantes}
            rows={comprobantes}
            getRowKey={(compra) => compra.id}
            isLoading={cargando}
            error={error}
            emptyTitle="Todavía no cargaste ningún comprobante"
            emptyDescription="Con el remito o la factura en la mano, usá «Cargar compra»."
            actions={(compra) => (
              compra.anuladoEn == null ? (
                <button
                  onClick={() => setCompraAAnular(compra)}
                  className="flex size-11 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger lg:size-8"
                  aria-label={`Anular ${nombreComprobante(compra.tipoComprobante)} ${compra.numero}`}
                  title="Anular"
                ><Trash2 size={15} /></button>
              ) : null
            )}
          />
          <Pagination
            page={paginaComprobantes}
            pageSize={COMPROBANTES_POR_PAGINA}
            total={totalComprobantes}
            onPageChange={setPaginaComprobantes}
          />

          <h2 className="mt-8 flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-rp-muted">
            <PackagePlus size={15} />Entradas de stock
          </h2>
          <p className="mb-3 mt-1 max-w-2xl text-sm text-rp-muted">
            Toda la mercadería que entró, renglón por renglón: la de los comprobantes de arriba
            y la que se carga de a un producto desde la lista.
          </p>
          <AdminTable
            columns={columnasCompras}
            rows={compras}
            getRowKey={(compra) => compra.id}
            isLoading={cargando}
            error={error}
            emptyTitle="Todavía no entró mercadería"
            emptyDescription="Cargá un comprobante o usá el botón de mercadería en la lista de productos."
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
                  onClick={() => setCuentaDe(proveedor)}
                  className="flex size-11 items-center justify-center rounded-md lg:size-8 text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent"
                  aria-label={`Ver la cuenta de ${proveedor.nombre}`}
                  title="Cuenta corriente"
                ><Wallet size={15} /></button>
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
                <Input label="Stock inicial" value={formProducto.stockInicial} onChange={(e) => setFormProducto((f) => ({ ...f, stockInicial: e.target.value }))} placeholder="10" />
              )}
              <Input label="Stock mínimo" value={formProducto.stockMinimo} onChange={(e) => setFormProducto((f) => ({ ...f, stockMinimo: e.target.value }))} placeholder="3" />
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

      <Modal
        isOpen={presentacionAbierta != null}
        onClose={() => setPresentacionAbierta(null)}
        title={presentacionAbierta?.presentacion ? 'Editar pack' : 'Agregar pack'}
        onSubmit={guardarPresentacion}
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-rp-muted">
            Una forma distinta de vender {presentacionAbierta?.producto.nombre}. El stock se
            sigue llevando de a una: el pack dice cuántas saca.
          </p>
          <Input
            label="Cómo se llama"
            value={formPresentacion.nombre}
            onChange={(e) => setFormPresentacion((f) => ({ ...f, nombre: e.target.value }))}
            placeholder="Tubo de 3"
          />
          <Input
            label="Unidades que saca del stock"
            value={formPresentacion.unidades}
            onChange={(e) => setFormPresentacion((f) => ({ ...f, unidades: e.target.value }))}
            soloNumeros
            placeholder="3"
          />
          <Input
            label="Precio del pack"
            value={formPresentacion.precioVenta}
            onChange={(e) => setFormPresentacion((f) => ({ ...f, precioVenta: e.target.value }))}
            placeholder="16000"
          />
          <p className="-mt-2 text-xs text-rp-muted">
            No tiene que ser el precio de la unidad por la cantidad: el pack suele salir más
            barato, y por eso el cliente lo lleva.
          </p>

          {errorPresentacion && <p role="alert" className="text-sm text-rp-danger">{errorPresentacion}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" size="sm" onClick={() => setPresentacionAbierta(null)}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={guardandoPresentacion}>
              {guardandoPresentacion ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={Boolean(productoHistorial)} onClose={() => setProductoHistorial(null)} title={productoHistorial?.nombre ?? 'Producto'} size="md">
        {productoHistorial && (
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {/* Los dos costos: el de la última compra es el que el club tiene en la
                cabeza, y el promedio es con el que se valúa el depósito y se mide el
                margen. Mostrar uno solo deja al dueño sin poder explicar el otro. */}
            <DatoFicha titulo="Última compra" valor={productoHistorial.costo != null ? formatearMoneda(productoHistorial.costo) : '—'} />
            <DatoFicha
              titulo="Costo promedio"
              valor={productoHistorial.costoPromedio != null ? formatearMoneda(productoHistorial.costoPromedio) : '—'}
            />
            <DatoFicha titulo="Precio venta" valor={formatearMoneda(productoHistorial.precioVenta)} />
            <DatoFicha
              titulo="Ganancia"
              valor={productoHistorial.margenUnitario != null ? formatearMoneda(productoHistorial.margenUnitario) : '—'}
              destacado
            />
            <DatoFicha
              titulo="Stock"
              valor={productoHistorial.controlaStock ? String(productoHistorial.stock) : 'No controla'}
              alerta={productoHistorial.necesitaReposicion}
            />
            {productoHistorial.controlaStock && (productoHistorial.costoPromedio ?? productoHistorial.costo) != null && (
              <DatoFicha
                titulo="Capital inmovilizado"
                valor={formatearMoneda((productoHistorial.costoPromedio ?? productoHistorial.costo ?? 0) * productoHistorial.stock)}
              />
            )}
            {productoHistorial.proveedorNombre && (
              <DatoFicha titulo="Proveedor" valor={productoHistorial.proveedorNombre} />
            )}
          </div>
        )}
        {/* Las formas de venderlo. El stock se lleva en la unidad base y cada pack dice
            cuántas saca: por eso vender un tubo baja el stock de a tres. */}
        {productoHistorial && productoHistorial.controlaStock && (
          <div className="mb-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-rp-muted">Cómo se vende</p>
              {authApi.esDuenio() && (
                <Button size="sm" variant="subtle" onClick={() => abrirPresentacion(productoHistorial, null)}>
                  <Plus size={14} />Agregar pack
                </Button>
              )}
            </div>
            {productoHistorial.presentaciones.length === 0 ? (
              <p className="text-sm text-rp-muted">
                Se vende de a una, a {formatearMoneda(productoHistorial.precioVenta)}. Si también
                lo vendés por pack —un tubo de pelotas, un six— agregalo acá con su precio.
              </p>
            ) : (
              <div>
                {productoHistorial.presentaciones.map((presentacion) => (
                  <div key={presentacion.id} className="flex items-center justify-between gap-3 border-b border-rp-border py-2 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-rp-text">{presentacion.nombre}</p>
                      <p className="text-xs text-rp-muted">
                        saca {presentacion.unidades} {presentacion.unidades === 1 ? 'unidad' : 'unidades'} del stock
                        {presentacion.margenUnitario != null ? ` · deja ${formatearMoneda(presentacion.margenUnitario)}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-bold text-rp-accent">{formatearMoneda(presentacion.precioVenta)}</span>
                      {authApi.esDuenio() && (
                        <>
                          <button
                            onClick={() => abrirPresentacion(productoHistorial, presentacion)}
                            className="flex size-9 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent lg:size-7"
                            aria-label={`Editar ${presentacion.nombre}`} title={`Editar ${presentacion.nombre}`}
                          ><Pencil size={14} /></button>
                          <button
                            onClick={() => darDeBajaPresentacion(presentacion.id)}
                            className="flex size-9 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger lg:size-7"
                            aria-label={`Dar de baja ${presentacion.nombre}`} title={`Dar de baja ${presentacion.nombre}`}
                          ><Trash2 size={14} /></button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-rp-muted">Movimientos de stock</p>
        {historial == null ? (
          <p className="text-sm text-rp-muted">Cargando...</p>
        ) : historial.length === 0 ? (
          <p className="text-sm text-rp-muted">Este producto todavía no tuvo movimientos.</p>
        ) : (
          <>
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
                  <div className="shrink-0 text-right">
                    <p className={`text-sm font-black ${movimiento.cantidad < 0 ? 'text-rp-danger' : 'text-rp-accent'}`}>
                      {movimiento.cantidad > 0 ? '+' : ''}{movimiento.cantidad}
                    </p>
                    {/* Las unidades que quedaban después. Sin esto, un "-3" no dice si
                        quedaron veinte o si se vendió lo último. */}
                    <p className="text-xs text-rp-muted">quedaban {movimiento.saldo}</p>
                  </div>
                </div>
              ))}
            </div>
            <Pagination
              page={paginaHistorial}
              pageSize={MOVIMIENTOS_POR_PAGINA}
              total={totalHistorial}
              onPageChange={setPaginaHistorial}
            />
          </>
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

      <ConfirmDialog
        isOpen={Boolean(compraAAnular)}
        onClose={() => setCompraAAnular(null)}
        onConfirm={anularCompra}
        title="Anular la compra"
        description={`Sale del stock todo lo que entró con ${nombreComprobante(compraAAnular?.tipoComprobante ?? '')} ${compraAAnular?.numero ?? ''} y se anula el egreso. La compra queda registrada como anulada: no se borra.`}
        confirmLabel="Anular"
        loadingLabel="Anulando..."
        pedirMotivo
        motivoPlaceholder="Vino mal el pedido, se cargó dos veces..."
      />

      <CompraModal
        abierto={modalCompra}
        onClose={() => setModalCompra(false)}
        onCargada={() => { cargar(); cargarComprobantes() }}
        productos={productos}
        proveedores={proveedores}
        fechaInicial={jornada || fechaISO()}
      />

      <CuentaProveedorModal
        proveedor={cuentaDe}
        onClose={() => setCuentaDe(null)}
        onPagado={cargar}
      />
    </section>
  )
}

/** Un número de la ficha del producto: rótulo arriba, valor grande abajo. */
function DatoFicha({ titulo, valor, destacado = false, alerta = false }: {
  titulo: string
  valor: string
  destacado?: boolean
  alerta?: boolean
}) {
  return (
    <div className="rounded-md border border-rp-border bg-rp-bg/55 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-rp-muted">{titulo}</p>
      <p className={`mt-0.5 text-sm font-black ${alerta ? 'text-rp-danger' : destacado ? 'text-rp-accent' : 'text-rp-text'}`}>
        {valor}
      </p>
    </div>
  )
}
