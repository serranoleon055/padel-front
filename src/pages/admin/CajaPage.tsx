import { Banknote, ChevronLeft, ChevronRight, History, Lock, Plus, ShoppingCart, Trash2, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'

import { useConfiguracionSede } from '@/app/providers/ConfiguracionSedeContext'
import { authApi } from '@/features/auth/authApi'
import { cajaApi, CATEGORIAS_GASTO, CONCEPTOS_MOVIMIENTO, MEDIOS, type CategoriaGasto, type CierreCaja, type ConceptoMovimiento, type MedioPago, type MovimientoCaja, type MovimientoSuelto, type TipoMovimiento } from '@/features/caja/cajaApi'
import { reservasApi } from '@/features/reservas/reservasApi'
import { ventasApi, type VentaResponse } from '@/features/ventas/ventasApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { fechaISO, formatearFecha, formatearMoneda } from '@/shared/lib/formatters'
import { aNumero } from '@/shared/lib/numeros'
import { AdminPageHeader } from '@/shared/ui/AdminPageHeader'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Pagination } from '@/shared/ui/Pagination'
import { VentaRapidaModal } from '@/pages/admin/VentaRapidaModal'
import { Select } from '@/shared/ui/Select'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { useToast } from '@/shared/ui/Toast'
import { usePaginaEnUrl, useReiniciarPaginaAlFiltrar } from '@/shared/lib/paginacion'

const aISO = fechaISO

function nombreMedio(medio: string) {
  return MEDIOS.find((m) => m.valor === medio)?.nombre ?? medio
}

function nombreCategoria(categoria: string) {
  return CATEGORIAS_GASTO.find((c) => c.valor === categoria)?.nombre ?? categoria
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

/** Horario del turno, que viene como HH:mm:ss. */
function hora(valor: string | null) {
  return valor ? valor.slice(0, 5) : ''
}

const MOVIMIENTOS_POR_PAGINA = 8

const MOVIMIENTO_VACIO = {
  concepto: 'COBRO_VARIO' as ConceptoMovimiento,
  tipo: '' as TipoMovimiento | '',
  descripcion: '',
  monto: '',
  medio: 'EFECTIVO' as MedioPago,
  notas: '',
}

function nombreConcepto(concepto: string) {
  return CONCEPTOS_MOVIMIENTO.find((c) => c.valor === concepto)?.nombre
    ?? (concepto === 'APERTURA' ? 'Apertura de caja' : concepto)
}

export default function CajaPage() {
  const [fecha, setFecha] = useState(aISO(new Date()))
  const [datos, setDatos] = useState<CierreCaja | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aAnular, setAAnular] = useState<MovimientoCaja | null>(null)
  const [anulando, setAnulando] = useState(false)
  const [paginaMovimientos, setPaginaMovimientos] = usePaginaEnUrl('paginaMovimientos')
  const { configuracion } = useConfiguracionSede()
  const [ventaAbierta, setVentaAbierta] = useState(false)
  const [aAnularVenta, setAAnularVenta] = useState<VentaResponse | null>(null)
  const { success: avisoExito } = useToast()

  const [gastoAbierto, setGastoAbierto] = useState(false)
  const [formGasto, setFormGasto] = useState({ ...GASTO_VACIO })
  const [guardandoGasto, setGuardandoGasto] = useState(false)
  const [errorGasto, setErrorGasto] = useState<string | null>(null)
  const [aBorrarGasto, setABorrarGasto] = useState<number | null>(null)
  const [borrandoGasto, setBorrandoGasto] = useState(false)

  const [cierreAbierto, setCierreAbierto] = useState(false)
  const [efectivoContado, setEfectivoContado] = useState('')
  const [notasCierre, setNotasCierre] = useState('')
  const [cerrando, setCerrando] = useState(false)
  const [errorCierre, setErrorCierre] = useState<string | null>(null)
  const [aReabrir, setAReabrir] = useState(false)
  const [anuladosAbierto, setAnuladosAbierto] = useState(false)

  const [movimientoAbierto, setMovimientoAbierto] = useState<'apertura' | 'suelto' | null>(null)
  const [formMovimiento, setFormMovimiento] = useState({ ...MOVIMIENTO_VACIO })
  const [guardandoMovimiento, setGuardandoMovimiento] = useState(false)
  const [errorMovimiento, setErrorMovimiento] = useState<string | null>(null)
  const [aAnularMovimiento, setAAnularMovimiento] = useState<MovimientoSuelto | null>(null)
  const [anulandoMovimiento, setAnulandoMovimiento] = useState(false)

  /** Los conceptos que puede cargar quien está mirando la pantalla. */
  const conceptosDisponibles = useMemo(
    () => CONCEPTOS_MOVIMIENTO.filter((concepto) => !concepto.soloDuenio || authApi.esDuenio()),
    [],
  )
  const conceptoElegido = CONCEPTOS_MOVIMIENTO.find((c) => c.valor === formMovimiento.concepto)

  function cargar() {
    setCargando(true)
    cajaApi.cierre(fecha)
      .then((d) => { setDatos(d); setError(null) })
      .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
      .finally(() => setCargando(false))
  }
  useEffect(cargar, [fecha])

  /**
   * La caja abre en la jornada del club, no en el día de calendario. A las 00:30 la caja
   * que se está por cerrar es la de la noche en curso: los cobros y las ventas de esa hora
   * están anotados ahí (V55), y abrir en el día nuevo mostraba un arqueo vacío mientras el
   * mostrador todavía estaba cobrando. Si la consulta falla queda el día de hoy.
   */
  useEffect(() => {
    let vigente = true
    reservasApi.jornadaActual()
      .then((jornada) => { if (vigente && jornada !== aISO(new Date())) setFecha(jornada) })
      .catch(() => undefined)
    return () => { vigente = false }
  }, [])

  function correrDia(dias: number) {
    const d = new Date(`${fecha}T12:00:00`)
    d.setDate(d.getDate() + dias)
    setFecha(aISO(d))
  }

  useReiniciarPaginaAlFiltrar(setPaginaMovimientos, [fecha])

  const movimientosPagina = useMemo(() => {
    const desde = (paginaMovimientos - 1) * MOVIMIENTOS_POR_PAGINA
    return datos?.movimientos.slice(desde, desde + MOVIMIENTOS_POR_PAGINA) ?? []
  }, [datos, paginaMovimientos])

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

  function abrirFormularioApertura() {
    setFormMovimiento({
      ...MOVIMIENTO_VACIO,
      concepto: 'APERTURA',
      descripcion: 'Fondo del día',
      monto: configuracion.fondoFijo != null ? String(configuracion.fondoFijo) : '',
    })
    setErrorMovimiento(null)
    setMovimientoAbierto('apertura')
  }

  function abrirFormularioMovimiento() {
    setFormMovimiento({ ...MOVIMIENTO_VACIO, concepto: conceptosDisponibles[0].valor })
    setErrorMovimiento(null)
    setMovimientoAbierto('suelto')
  }

  async function guardarMovimiento() {
    const monto = aNumero(formMovimiento.monto)
    if (!formMovimiento.descripcion.trim()) { setErrorMovimiento('Escribí de qué es el movimiento.'); return }
    if (monto == null || monto <= 0) { setErrorMovimiento('El monto tiene que ser mayor a cero.'); return }
    const fijo = CONCEPTOS_MOVIMIENTO.find((c) => c.valor === formMovimiento.concepto)?.tipoFijo ?? null
    if (movimientoAbierto === 'suelto' && fijo == null && !formMovimiento.tipo) {
      setErrorMovimiento('Indicá si la plata entra o sale.')
      return
    }
    setGuardandoMovimiento(true)
    setErrorMovimiento(null)
    try {
      const cuerpo = {
        concepto: formMovimiento.concepto,
        tipo: fijo ?? (formMovimiento.tipo || null),
        descripcion: formMovimiento.descripcion.trim(),
        monto,
        medio: formMovimiento.medio,
        clienteId: null,
        notas: formMovimiento.notas.trim() || null,
      }
      if (movimientoAbierto === 'apertura') {
        await cajaApi.abrirCaja(cuerpo)
        avisoExito('Caja abierta')
      } else {
        await cajaApi.registrarMovimiento(cuerpo)
        avisoExito('Movimiento registrado')
      }
      setMovimientoAbierto(null)
      cargar()
    } catch (e: unknown) {
      setErrorMovimiento(obtenerMensajeErrorApi(e))
    } finally { setGuardandoMovimiento(false) }
  }

  async function anularMovimiento(motivo: string) {
    if (aAnularMovimiento == null) return
    setAnulandoMovimiento(true)
    try {
      await cajaApi.anularMovimiento(aAnularMovimiento.id, motivo)
      setAAnularMovimiento(null)
      cargar()
      avisoExito('Movimiento anulado')
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e)); setAAnularMovimiento(null)
    } finally { setAnulandoMovimiento(false) }
  }

  async function anularGasto(motivo: string) {
    if (aBorrarGasto == null) return
    setBorrandoGasto(true)
    try {
      await cajaApi.anularGasto(aBorrarGasto, motivo)
      setABorrarGasto(null)
      cargar()
      avisoExito('Gasto anulado')
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e)); setABorrarGasto(null)
    } finally { setBorrandoGasto(false) }
  }

  /**
   * El backend rechaza la primera vez si el consumo ya se cobró junto con el turno: ahí
   * se le muestra al mostrador qué implica y se reintenta confirmado.
   */
  async function anularVenta(motivo: string) {
    if (!aAnularVenta) return
    const venta = aAnularVenta
    try {
      await ventasApi.anular(venta.id, motivo)
      setAAnularVenta(null)
      cargar()
      avisoExito('Venta anulada y stock devuelto')
    } catch (e: unknown) {
      const mensaje = obtenerMensajeErrorApi(e)
      if (mensaje.includes('ya se cobró') && window.confirm(`${mensaje}\n\n¿Anular igual?`)) {
        try {
          await ventasApi.anular(venta.id, motivo, true)
          setAAnularVenta(null)
          cargar()
          avisoExito('Venta anulada y stock devuelto')
          return
        } catch (otro: unknown) {
          setError(obtenerMensajeErrorApi(otro)); setAAnularVenta(null); return
        }
      }
      setError(mensaje); setAAnularVenta(null)
    }
  }

  /** El movimiento puede estar compuesto por varios cobros: se anulan todos juntos. */
  async function anular(motivo: string) {
    if (!aAnular) return
    setAnulando(true)
    try {
      await Promise.all(aAnular.cobroIds.map((id) => cajaApi.anular(id, motivo)))
      setAAnular(null)
      cargar()
      avisoExito('Cobro anulado')
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e)); setAAnular(null)
    } finally { setAnulando(false) }
  }

  async function cerrarCaja() {
    const contado = aNumero(efectivoContado)
    if (contado == null) { setErrorCierre('Escribí cuánto efectivo había en el cajón'); return }
    setCerrando(true)
    try {
      await cajaApi.cerrar({ fecha, efectivoContado: contado, notas: notasCierre.trim() || null })
      setCierreAbierto(false)
      cargar()
      avisoExito('Caja cerrada')
    } catch (e: unknown) {
      setErrorCierre(obtenerMensajeErrorApi(e))
    } finally { setCerrando(false) }
  }

  async function reabrirCaja() {
    try {
      await cajaApi.reabrir(fecha)
      setAReabrir(false)
      cargar()
      avisoExito('Caja reabierta')
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e)); setAReabrir(false)
    }
  }

  return (
    <section>
      <AdminPageHeader
        title={<><Banknote size={26} />Caja</>}
        action={<>
          <Button size="sm" onClick={() => setVentaAbierta(true)}><ShoppingCart size={16} />Vender</Button>
          {/* El historial de arqueos es del dueño: el menú no se lo ofrece al empleado
              para no mandarlo a un 403, pero el backend lo rechaza igual. */}
          {authApi.esDuenio() && (
            <Button size="sm" variant="subtle" asChild>
              <NavLink to="/admin/caja/historial"><History size={16} />Historial</NavLink>
            </Button>
          )}
        </>}
      />

      <div className="mt-4 flex items-center gap-2">
        <button onClick={() => correrDia(-1)} className="flex size-11 items-center justify-center rounded-md border border-rp-border text-rp-muted hover:text-rp-accent lg:size-9" aria-label="Día anterior"><ChevronLeft size={16} /></button>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="h-11 rounded-md border border-rp-border bg-rp-surface px-3 text-base text-rp-text lg:h-9 lg:text-sm"
        />
        <button onClick={() => correrDia(1)} className="flex size-11 items-center justify-center rounded-md border border-rp-border text-rp-muted hover:text-rp-accent lg:size-9" aria-label="Día siguiente"><ChevronRight size={16} /></button>
        <Button size="sm" variant="subtle" onClick={() => setFecha(aISO(new Date()))}>Hoy</Button>
      </div>

      {error && <p className="mt-4 rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{error}</p>}
      {cargando && <p className="mt-6 text-sm text-rp-muted">Cargando...</p>}

      {datos && !cargando && (
        datos.arqueo ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rp-accent/40 bg-rp-accent/5 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-rp-text">
                Caja cerrada · contaron {formatearMoneda(datos.arqueo.efectivoContado)}
                <span className={datos.arqueo.diferencia === 0 ? 'ml-2 text-rp-muted' : `ml-2 ${datos.arqueo.diferencia < 0 ? 'text-rp-danger' : 'text-rp-accent'}`}>
                  {datos.arqueo.diferencia === 0
                    ? 'sin diferencia'
                    : `${datos.arqueo.diferencia < 0 ? 'faltaron' : 'sobraron'} ${formatearMoneda(Math.abs(datos.arqueo.diferencia))}`}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-rp-muted">
                Cerró {datos.arqueo.cerradoPor ?? 'el sistema'} a las {hhmm(datos.arqueo.cerradoEn)}
                {datos.arqueo.notas ? ` · ${datos.arqueo.notas}` : ''}
              </p>
            </div>
            {/* Reabrir es solo del dueño: si el que cobró puede reabrir su propio
                arqueo, la firma del cierre no vale nada. El backend lo rechaza igual. */}
            {authApi.esDuenio() && (
              <Button size="sm" variant="ghost" onClick={() => setAReabrir(true)}>Reabrir</Button>
            )}
          </div>
        ) : !datos.cajaAbierta ? (
          // Sin declarar el fondo, el efectivo esperado arranca de cero y la diferencia
          // del arqueo sale sobrando por el cambio que quedó en el cajón de ayer.
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rp-accent/40 bg-rp-accent/5 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-rp-text">Falta abrir la caja</p>
              <p className="mt-0.5 text-xs text-rp-muted">
                Deciles con cuánto arranca el cajón. Sin eso, el arqueo de esta noche va a
                dar sobrando justo por el cambio que dejaron para dar vuelto.
              </p>
            </div>
            <Button size="sm" onClick={abrirFormularioApertura}>
              <Wallet size={15} />Abrir caja
            </Button>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rp-border bg-rp-surface px-4 py-3">
            <p className="text-sm text-rp-muted">
              El día está abierto con {formatearMoneda(datos.fondoInicial)} de fondo. Al
              cerrarlo se guarda cuánto había en el cajón y los movimientos quedan fijos.
            </p>
            <Button size="sm" onClick={() => { setEfectivoContado(''); setNotasCierre(''); setErrorCierre(null); setCierreAbierto(true) }}>
              <Lock size={15} />Cerrar caja
            </Button>
          </div>
        )
      )}

      {datos && !cargando && (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-rp-accent/40 bg-rp-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-rp-muted">Efectivo en caja</p>
              <p className="mt-1 text-3xl font-black text-rp-accent">{formatearMoneda(datos.efectivoEsperado)}</p>
              <p className="mt-1 text-xs text-rp-muted">Lo que tiene que estar en el cajón.</p>
            </div>
            <div className="rounded-lg border border-rp-border bg-rp-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-rp-muted">Cobrado en el mostrador</p>
              <p className="mt-1 text-3xl font-black text-rp-text">{formatearMoneda(datos.totalMostrador)}</p>
              <p className="mt-1 text-xs text-rp-muted">Efectivo, transferencia y tarjeta.</p>
            </div>
            <div className="rounded-lg border border-rp-border bg-rp-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-rp-muted">Señas cobradas online</p>
              <p className="mt-1 text-3xl font-black text-rp-text">{formatearMoneda(datos.seniasOnline)}</p>
              <p className="mt-1 text-xs text-rp-muted">Van a la cuenta de Mercado Pago, no al cajón.</p>
            </div>
            <div className="rounded-lg border border-rp-border bg-rp-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-rp-muted">Falta cobrar</p>
              <p className={`mt-1 text-3xl font-black ${datos.saldoPendiente > 0 ? 'text-rp-danger' : 'text-rp-text'}`}>
                {formatearMoneda(datos.saldoPendiente)}
              </p>
              <p className="mt-1 text-xs text-rp-muted">
                {datos.turnosConSaldo === 1 ? '1 turno de hoy debe plata.' : `${datos.turnosConSaldo} turnos de hoy deben plata.`}
              </p>
            </div>
          </div>

          {/* Los gastos y la rentabilidad son del dueño: al empleado el backend se los
              manda en null, y la pantalla no dibuja un panel vacío. Lo que sí ve es
              cuánto salió del cajón, porque sin eso el efectivo esperado no se explica. */}
          {datos.egresos != null && datos.resultado != null ? (
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
          ) : (
            <div className="mt-4 rounded-lg border border-rp-border bg-rp-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-rp-muted">Pagos del cajón</p>
              <p className="mt-1 text-3xl font-black text-rp-text">{formatearMoneda(datos.egresosEfectivo)}</p>
              <p className="mt-1 text-xs text-rp-muted">Ya descontados del efectivo esperado.</p>
            </div>
          )}

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
                    <span className="text-sm font-bold text-rp-muted">Total cobrado en el día</span>
                    <span className="text-sm font-black text-rp-accent">{formatearMoneda(datos.totalDelDia)}</span>
                  </div>
                  {(datos.cobrosAnulados.length > 0 || datos.ventasAnuladas.length > 0) && (
                    <button
                      type="button"
                      onClick={() => setAnuladosAbierto(true)}
                      className="mt-2 self-start text-xs font-bold text-rp-muted underline hover:text-rp-accent"
                    >
                      Ver {datos.cobrosAnulados.length + datos.ventasAnuladas.length} anulados del día
                    </button>
                  )}
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
                <>
                  <div className="mt-3">
                    {movimientosPagina.map((mov) => (
                      <div key={mov.cobroIds.join('-')} className="flex items-center justify-between gap-3 border-b border-rp-border py-2 last:border-0">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-rp-text">{mov.clienteNombre}</p>
                          <p className="text-xs text-rp-muted">
                            {mov.horaInicio ? `Turno ${hora(mov.horaInicio)} a ${hora(mov.horaFin)}` : 'Turno'}
                            {mov.canchaNombre ? ` · ${mov.canchaNombre}` : ''}
                            {' · '}{nombreMedio(mov.medio)}
                          </p>
                          <p className="text-xs text-rp-muted">
                            Cobrado {hhmm(mov.cobradoEn)}{mov.registradoPor ? ` por ${mov.registradoPor}` : ''}
                          </p>
                          {mov.notas && <p className="text-xs italic text-rp-muted">{mov.notas}</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-sm font-bold text-rp-text">{formatearMoneda(mov.monto)}</span>
                          <button onClick={() => setAAnular(mov)} className="flex size-11 items-center justify-center rounded-md lg:size-8 text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger" aria-label="Anular cobro" title="Anular cobro"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Pagination
                    page={paginaMovimientos}
                    pageSize={MOVIMIENTOS_POR_PAGINA}
                    total={datos.movimientos.length}
                    onPageChange={setPaginaMovimientos}
                  />
                </>
              )}
            </div>
          </div>

          {/* Quién cobró qué. El dato estaba en la base desde siempre y no se mostraba,
              así que no había forma de ver si el faltante aparece siempre en el mismo
              turno. El backend se lo manda vacío al empleado. */}
          {datos.porUsuario.length > 0 && (
            <div className="mt-6 rounded-lg border border-rp-border bg-rp-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-rp-muted">Quién cobró</p>
              <div className="mt-3">
                {datos.porUsuario.map((fila) => (
                  <div key={fila.usuario} className="flex items-center justify-between gap-3 border-b border-rp-border py-2 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-rp-text">{fila.usuario}</p>
                      <p className="text-xs text-rp-muted">
                        {fila.operaciones === 1 ? '1 operación' : `${fila.operaciones} operaciones`}
                        {' · '}turnos {formatearMoneda(fila.cobros)}
                        {fila.ventas !== 0 ? ` · kiosco ${formatearMoneda(fila.ventas)}` : ''}
                        {fila.movimientos !== 0 ? ` · otros ${formatearMoneda(fila.movimientos)}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-rp-text">{formatearMoneda(fila.total)}</p>
                      {/* Lo que se le pide al entregar el turno es el efectivo. */}
                      <p className="text-xs text-rp-muted">{formatearMoneda(fila.efectivo)} en efectivo</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {datos && !cargando && (
        <div className="mt-6 rounded-lg border border-rp-border bg-rp-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-rp-muted">
                Plata que no es un turno ni el kiosco
              </p>
              <p className="mt-0.5 text-xs text-rp-muted">
                El fondo de apertura, un depósito al banco, el alquiler del salón. Mueven el
                cajón; solo los cobros mueven la facturación.
              </p>
            </div>
            <Button size="sm" variant="subtle" onClick={abrirFormularioMovimiento}>
              <Plus size={15} />Movimiento
            </Button>
          </div>
          {datos.movimientosSueltos.length === 0 ? (
            <p className="mt-3 text-sm text-rp-muted">No hay movimientos cargados en el día.</p>
          ) : (
            <div className="mt-3">
              {datos.movimientosSueltos.map((mov) => (
                <div key={mov.id} className="flex items-center justify-between gap-3 border-b border-rp-border py-2 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-rp-text">{mov.descripcion}</p>
                    <p className="text-xs text-rp-muted">
                      {nombreConcepto(mov.concepto)} · {nombreMedio(mov.medio)} · {hhmm(mov.fecha)}
                      {mov.registradoPor ? ` por ${mov.registradoPor}` : ''}
                    </p>
                    {mov.notas && <p className="text-xs italic text-rp-muted">{mov.notas}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`text-sm font-bold ${mov.tipo === 'EGRESO' ? 'text-rp-danger' : 'text-rp-accent'}`}>
                      {mov.tipo === 'EGRESO' ? '−' : '+'}{formatearMoneda(mov.monto)}
                    </span>
                    {/* Anular es solo del dueño, por lo mismo que reabrir un cierre. */}
                    {authApi.esDuenio() && (
                      <button onClick={() => setAAnularMovimiento(mov)} className="flex size-11 items-center justify-center rounded-md lg:size-8 text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger" aria-label="Anular movimiento" title="Anular movimiento"><Trash2 size={14} /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {datos && !cargando && (
        <div className="mt-6 rounded-lg border border-rp-border bg-rp-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-rp-muted">
              Vendido en el mostrador · {formatearMoneda(datos.totalVentas)}
            </p>
            <Button size="sm" variant="subtle" onClick={() => setVentaAbierta(true)}><ShoppingCart size={15} />Vender</Button>
          </div>
          {datos.ventas.length === 0 ? (
            <p className="mt-3 text-sm text-rp-muted">Todavía no se vendió nada en el día.</p>
          ) : (
            <div className="mt-3">
              {datos.ventas.map((venta) => (
                <div key={venta.id} className="flex items-center justify-between gap-3 border-b border-rp-border py-2 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-rp-text">{venta.detalle}</p>
                    <p className="text-xs text-rp-muted">
                      {hhmm(venta.fecha)} · {venta.medio
                        ? nombreMedio(venta.medio)
                        : 'anotado en el turno, sin cobrar'}
                      {venta.registradoPor ? ` · ${venta.registradoPor}` : ''}
                    </p>
                    {/* Sin esto, una venta bonificada se ve igual que una al precio de
                        lista y el dueño no tiene cómo enterarse de que hubo descuento. */}
                    {venta.descuento > 0 && (
                      <p className="text-xs text-rp-accent">
                        {formatearMoneda(venta.descuento)} de descuento
                        {venta.motivoDescuento ? ` · ${venta.motivoDescuento}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-bold text-rp-text">{formatearMoneda(venta.total)}</span>
                    <button onClick={() => setAAnularVenta(venta)} className="flex size-11 items-center justify-center rounded-md lg:size-8 text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger" aria-label="Anular venta" title="Anular venta"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
                    <button onClick={() => setABorrarGasto(gasto.id)} className="flex size-11 items-center justify-center rounded-md lg:size-8 text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger" aria-label="Anular gasto" title="Anular gasto"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <VentaRapidaModal abierto={ventaAbierta} onClose={() => setVentaAbierta(false)} onVendido={cargar} />

      <ConfirmDialog
        isOpen={Boolean(aAnularVenta)}
        onClose={() => setAAnularVenta(null)}
        onConfirm={anularVenta}
        title="Anular venta"
        description={aAnularVenta
          ? `La venta de ${formatearMoneda(aAnularVenta.total)} deja de sumar y la mercadería vuelve al stock. Queda registrada como anulada.`
          : ''}
        confirmLabel="Anular"
        loadingLabel="Anulando..."
        pedirMotivo
        motivoPlaceholder="Se cargó al turno equivocado"
      />

      <Modal isOpen={cierreAbierto} onClose={() => setCierreAbierto(false)} title="Cerrar la caja del día" size="sm">
        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-rp-border bg-rp-bg/55 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-rp-muted">Tendría que haber en el cajón</span>
              <span className="text-sm font-black text-rp-accent">{formatearMoneda(datos?.efectivoEsperado ?? 0)}</span>
            </div>
            <p className="mt-1 text-xs text-rp-muted">Cobrado en efectivo menos los gastos que se pagaron del cajón.</p>
          </div>
          <Input
            label="Cuánto había de verdad"
            value={efectivoContado}
            onChange={(e) => setEfectivoContado(e.target.value)}
            placeholder="Contá el efectivo y escribilo"
            inputMode="decimal"
          />
          <Input
            label="Notas (opcional)"
            value={notasCierre}
            onChange={(e) => setNotasCierre(e.target.value)}
            placeholder="Por ejemplo: faltan $2.000, se los llevó Juan de adelanto"
          />
          {errorCierre && <p className="text-sm font-bold text-rp-danger">{errorCierre}</p>}
          <p className="text-xs text-rp-muted">
            Después de cerrar, los cobros, ventas y gastos de este día no se pueden tocar hasta reabrirlo.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setCierreAbierto(false)} disabled={cerrando}>Cancelar</Button>
            <Button size="sm" onClick={cerrarCaja} disabled={cerrando}>{cerrando ? 'Cerrando...' : 'Cerrar caja'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={aReabrir}
        onClose={() => setAReabrir(false)}
        onConfirm={reabrirCaja}
        title="Reabrir la caja"
        description="Se borra el arqueo firmado de este día y los movimientos vuelven a poder editarse. Queda registrado quién lo reabrió."
        confirmLabel="Reabrir"
        loadingLabel="Reabriendo..."
        tono="normal"
      />

      <Modal isOpen={anuladosAbierto} onClose={() => setAnuladosAbierto(false)} title="Anulados del día" size="md">
        {(datos?.cobrosAnulados.length ?? 0) === 0 && (datos?.ventasAnuladas.length ?? 0) === 0 ? (
          <p className="py-6 text-center text-sm text-rp-muted">No se anuló nada este día.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {datos?.cobrosAnulados.map((cobro) => (
              <li key={`c${cobro.id}`} className="rounded-md border border-rp-border bg-rp-bg/55 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-rp-text">Cobro · {cobro.clienteNombre ?? 'Sin nombre'}</span>
                  <span className="text-sm font-black text-rp-muted line-through">{formatearMoneda(cobro.monto)}</span>
                </div>
                <p className="mt-0.5 text-xs text-rp-muted">
                  Anuló {cobro.anuladoPor ?? 'el sistema'}{cobro.motivoAnulacion ? ` · ${cobro.motivoAnulacion}` : ''}
                </p>
              </li>
            ))}
            {datos?.ventasAnuladas.map((venta) => (
              <li key={`v${venta.id}`} className="rounded-md border border-rp-border bg-rp-bg/55 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-rp-text">Venta · {venta.detalle}</span>
                  <span className="text-sm font-black text-rp-muted line-through">{formatearMoneda(venta.total)}</span>
                </div>
                <p className="mt-0.5 text-xs text-rp-muted">
                  Anuló {venta.anuladoPor ?? 'el sistema'}{venta.motivoAnulacion ? ` · ${venta.motivoAnulacion}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Modal>

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
          <Input label="Proveedor" value={formGasto.proveedor} onChange={(e) => setFormGasto((f) => ({ ...f, proveedor: e.target.value }))} />
          {errorGasto && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorGasto}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setGastoAbierto(false)} disabled={guardandoGasto}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={guardandoGasto}>{guardandoGasto ? 'Guardando...' : 'Registrar'}</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={movimientoAbierto != null}
        onClose={() => setMovimientoAbierto(null)}
        title={movimientoAbierto === 'apertura' ? 'Abrir la caja del día' : 'Movimiento de caja'}
        onSubmit={guardarMovimiento}
      >
        <div className="flex flex-col gap-4">
          {movimientoAbierto === 'apertura' ? (
            <p className="text-sm text-rp-muted">
              El efectivo con el que arranca el cajón. Es el cambio que quedó para dar
              vuelto: si no se declara, el arqueo de esta noche va a dar sobrando justo por
              ese monto.
            </p>
          ) : (
            <Select
              label="De qué se trata"
              value={formMovimiento.concepto}
              onChange={(e) => setFormMovimiento((f) => ({
                ...f, concepto: e.target.value as ConceptoMovimiento, tipo: '',
              }))}
            >
              {conceptosDisponibles.map((concepto) => (
                <option key={concepto.valor} value={concepto.valor}>{concepto.nombre}</option>
              ))}
            </Select>
          )}

          {movimientoAbierto === 'suelto' && conceptoElegido && (
            <p className="-mt-2 text-xs text-rp-muted">{conceptoElegido.ayuda}</p>
          )}

          {/* Solo los conceptos que van en los dos sentidos piden elegir. En los demás lo
              impone el servidor: un retiro del dueño que sume plata no existe. */}
          {movimientoAbierto === 'suelto' && conceptoElegido && conceptoElegido.tipoFijo == null && (
            <Select
              label="¿La plata entra o sale?"
              value={formMovimiento.tipo}
              onChange={(e) => setFormMovimiento((f) => ({ ...f, tipo: e.target.value as TipoMovimiento }))}
            >
              <option value="">Elegí una opción</option>
              <option value="INGRESO">Entra al cajón</option>
              <option value="EGRESO">Sale del cajón</option>
            </Select>
          )}

          <Input
            label="Descripción"
            value={formMovimiento.descripcion}
            onChange={(e) => setFormMovimiento((f) => ({ ...f, descripcion: e.target.value }))}
            placeholder={movimientoAbierto === 'apertura' ? 'Fondo del día' : 'Alquiler del salón del sábado'}
          />
          <Input
            label="Monto"
            value={formMovimiento.monto}
            onChange={(e) => setFormMovimiento((f) => ({ ...f, monto: e.target.value }))}
            placeholder="20000"
          />
          <Select
            label="Medio"
            value={formMovimiento.medio}
            onChange={(e) => setFormMovimiento((f) => ({ ...f, medio: e.target.value as MedioPago }))}
          >
            {MEDIOS.map((medio) => <option key={medio.valor} value={medio.valor}>{medio.nombre}</option>)}
          </Select>
          <Input
            label="Notas (opcional)"
            value={formMovimiento.notas}
            onChange={(e) => setFormMovimiento((f) => ({ ...f, notas: e.target.value }))}
          />

          {errorMovimiento && <p role="alert" className="text-sm text-rp-danger">{errorMovimiento}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setMovimientoAbierto(null)}>Cancelar</Button>
            <Button type="submit" disabled={guardandoMovimiento}>
              {guardandoMovimiento ? 'Guardando...' : movimientoAbierto === 'apertura' ? 'Abrir caja' : 'Registrar'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={aAnularMovimiento != null}
        onClose={() => setAAnularMovimiento(null)}
        onConfirm={anularMovimiento}
        title="Anular movimiento"
        description={aAnularMovimiento
          ? `${aAnularMovimiento.descripcion} por ${formatearMoneda(aAnularMovimiento.monto)} deja de contar en el arqueo. Queda registrado como anulado.`
          : ''}
        confirmLabel="Anular"
        loadingLabel="Anulando..."
        pedirMotivo
        motivoPlaceholder="Lo cargué mal"
        isLoading={anulandoMovimiento}
      />

      <ConfirmDialog
        isOpen={aBorrarGasto != null}
        onClose={() => setABorrarGasto(null)}
        onConfirm={anularGasto}
        title="Anular gasto"
        description="El gasto deja de sumar en el arqueo y en el resultado del mes. Queda registrado como anulado, con el motivo y quién lo anuló."
        confirmLabel="Anular"
        loadingLabel="Anulando..."
        pedirMotivo
        motivoPlaceholder="Lo cargué dos veces"
        isLoading={borrandoGasto}
      />

      <ConfirmDialog
        isOpen={aAnular != null}
        onClose={() => setAAnular(null)}
        onConfirm={anular}
        title="Anular cobro"
        description={aAnular
          ? `El cobro de ${formatearMoneda(aAnular.monto)} de ${aAnular.clienteNombre ?? 'este turno'} deja de sumar y el turno vuelve a quedar debiendo. Queda registrado como anulado.`
          : ''}
        confirmLabel="Anular"
        loadingLabel="Anulando..."
        pedirMotivo
        motivoPlaceholder="Se cobró de más"
        isLoading={anulando}
      />
    </section>
  )
}
