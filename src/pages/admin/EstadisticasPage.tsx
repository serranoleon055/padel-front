import { BarChart3, CalendarClock, CalendarDays, Download, Package, Percent, TrendingUp, Trophy, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { placesApi } from '@/features/catalog/catalogApi'
import { estadisticasApi } from '@/features/estadisticas/estadisticasApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { descargarCsv, numeroCsv } from '@/shared/lib/csv'
import { fechaISO, formatearMoneda } from '@/shared/lib/formatters'
import { horasDeLaJornada } from '@/shared/lib/jornada'
import type { EstadisticasResponse, LugarResponse } from '@/shared/types/api'
import { Button } from '@/shared/ui/Button'
import { SegmentedToggle } from '@/shared/ui/SegmentedToggle'
import { StatusMessage } from '@/shared/ui/StatusMessage'

/**
 * El estado de resultados en una planilla: una fila por concepto y una columna por mes,
 * igual que en pantalla. Es lo que el dueño le pasa al contador.
 */
function exportarEstadoResultados(datos: EstadisticasResponse) {
  const meses = datos.ingresosPorMes
  const fila = (titulo: string, valores: number[]) => [titulo, ...valores.map(numeroCsv)]
  descargarCsv(`estado-de-resultados-${fechaISO()}`, [
    ['Concepto', ...meses.map((m) => m.mes)],
    fila('Turnos', meses.map((m) => m.turnos)),
    fila('Inscripciones', meses.map((m) => m.inscripciones)),
    fila('Mostrador', meses.map((m) => m.ventas)),
    fila('Ingresos', meses.map((m) => m.ingresos)),
    fila('Costo de lo vendido', meses.map((m) => -m.costoMercaderia)),
    fila('Ganancia bruta', meses.map((m) => m.gananciaBruta)),
    fila('Gastos operativos', meses.map((m) => -m.gastosOperativos)),
    fila('Resultado', meses.map((m) => m.resultado)),
    [],
    fila('Compras de mercadería (inventario, no gasto)', meses.map((m) => m.comprasMercaderia)),
  ])
}

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const CLAVE_SECCION = 'rp-estadisticas-seccion'

type Seccion = 'dinero' | 'turnos' | 'torneos'

const SECCIONES: { valor: Seccion; label: string }[] = [
  { valor: 'dinero', label: 'Dinero' },
  { valor: 'turnos', label: 'Turnos' },
  { valor: 'torneos', label: 'Torneos' },
]
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function etiquetaMes(mes: string) {
  const [anio, numero] = mes.split('-')
  return `${MESES[Number(numero) - 1] ?? ''} ${anio.slice(2)}`
}

/**
 * Redondear a "0%" algo que no es cero se lee como un error del sistema, pero el "<1%"
 * que había antes tampoco se entendía de un vistazo: se lee como un símbolo raro más que
 * como un número. Un decimal dice lo mismo y se lee solo.
 */
function porcentaje(valor: number) {
  const porciento = valor * 100
  // Se trunca en vez de redondear: 0,98% redondeado da "1,0%", que dice justo lo
  // contrario de lo que pasó. El piso es 0,1 para no volver a caer en el cero.
  if (porciento > 0 && porciento < 1) return `${Math.max(0.1, Math.floor(porciento * 10) / 10).toFixed(1)}%`
  return `${Math.round(porciento)}%`
}

export default function EstadisticasPage() {
  const [lugares, setLugares] = useState<LugarResponse[]>([])
  const [lugarId, setLugarId] = useState<number | null>(null)
  const [datos, setDatos] = useState<EstadisticasResponse | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [diaElegido, setDiaElegido] = useState('todos')
  // Todo junto era un scroll interminable, sobre todo en el celular. Separado por lo que
  // el dueño va a mirar: la plata, la cancha o los torneos.
  const [seccion, setSeccion] = useState<Seccion>(() => (sessionStorage.getItem(CLAVE_SECCION) as Seccion) ?? 'dinero')
  useEffect(() => { sessionStorage.setItem(CLAVE_SECCION, seccion) }, [seccion])

  useEffect(() => {
    placesApi.getAll().then(setLugares).catch(() => {})
  }, [])

  useEffect(() => {
    setCargando(true)
    estadisticasApi.obtener(lugarId ?? undefined)
      .then((d) => { setDatos(d); setError(null) })
      .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
      .finally(() => setCargando(false))
  }, [lugarId])

  /**
   * Las horas se listan en orden de jornada, arrancando por la de apertura. Ordenarlas
   * por número ponía la 1 AM —que es el último turno de la noche— arriba de todo.
   */
  const rangoHoras = useMemo(() => {
    if (!datos || datos.heatmap.length === 0) return [] as number[]
    return horasDeLaJornada(datos.horaApertura ?? 0, datos.heatmap.map((f) => f.hora))
  }, [datos])

  /**
   * Turnos vendidos por hora, para el día elegido o para toda la semana. El mapa de
   * calor de cuadraditos que había antes era ilegible: lo único que el club necesita
   * saber es qué horas se llenan y cuáles quedan flojas.
   */
  const horasDelDia = useMemo(() => {
    const filas = (datos?.heatmap ?? [])
      .filter((f) => diaElegido === 'todos' || String(f.diaSemana) === diaElegido)
    const porHora = new Map<number, number>()
    filas.forEach((f) => porHora.set(f.hora, (porHora.get(f.hora) ?? 0) + f.cantidad))

    const barras = rangoHoras.map((hora) => ({ hora, cantidad: porHora.get(hora) ?? 0 }))
    const pico = barras.reduce<{ hora: number; cantidad: number } | null>(
      (mayor, barra) => (mayor == null || barra.cantidad > mayor.cantidad ? barra : mayor), null)

    return {
      barras,
      pico: pico && pico.cantidad > 0 ? pico : null,
      total: barras.reduce((suma, barra) => suma + barra.cantidad, 0),
    }
  }, [datos, diaElegido, rangoHoras])
  /** Turnos vendidos por día de la semana en todo el período, sacados del mismo heatmap. */
  const turnosPorDia = useMemo(() => {
    const porDia = new Map<number, number>()
    ;(datos?.heatmap ?? []).forEach((f) => porDia.set(f.diaSemana, (porDia.get(f.diaSemana) ?? 0) + f.cantidad))
    const barras = DIAS.map((dia, indice) => ({ dia, cantidad: porDia.get(indice + 1) ?? 0 }))
    return {
      barras,
      maximo: Math.max(1, ...barras.map((b) => b.cantidad)),
      total: barras.reduce((suma, b) => suma + b.cantidad, 0),
    }
  }, [datos])

  const maxCategoria = useMemo(() => Math.max(1, ...(datos?.categoriasDemandadas.map((c) => c.inscriptos) ?? [1])), [datos])
  const maxIngreso = useMemo(
    // Los gastos entran en la escala: si no, una barra de egresos alta se saldría del panel.
    () => Math.max(1, ...(datos?.ingresosPorMes.flatMap((m) => [m.turnos, m.inscripciones, m.ventas, m.gastosOperativos]) ?? [1])),
    [datos],
  )

  return (
    <section className="admin-page">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-rp-accent">Admin</p>
      <h1 className="mt-2 text-3xl font-black text-rp-text sm:text-5xl">Estadísticas</h1>
      <p className="mt-2 text-sm text-rp-muted">Inteligencia de negocio de los últimos 6 meses.</p>

      <div className="mt-4 flex flex-wrap gap-1 rounded-lg border border-rp-border bg-rp-surface/82 p-1">
        <button
          type="button"
          onClick={() => setLugarId(null)}
          className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-bold transition ${lugarId === null ? 'bg-rp-surface-2 text-rp-accent' : 'text-rp-muted hover:text-rp-text'}`}
        >
          Todas las sedes
        </button>
        {lugares.map((lugar) => (
          <button
            key={lugar.id}
            type="button"
            onClick={() => setLugarId(lugar.id)}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-bold transition ${lugarId === lugar.id ? 'bg-rp-surface-2 text-rp-accent' : 'text-rp-muted hover:text-rp-text'}`}
          >
            {lugar.nombre}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <SegmentedToggle valor={seccion} onChange={(valor) => setSeccion(valor as Seccion)} opciones={SECCIONES} />
        {datos && seccion === 'dinero' && (
          <Button variant="subtle" size="sm" onClick={() => exportarEstadoResultados(datos)}>
            <Download size={15} />Exportar a Excel
          </Button>
        )}
      </div>

      {cargando && !datos ? (
        <div className="mt-6"><StatusMessage type="loading" title="Cargando estadísticas..." /></div>
      ) : error ? (
        <div className="mt-6"><StatusMessage type="error" title="Error al cargar" description={error} /></div>
      ) : !datos ? null : (
        <div className="mt-5 flex flex-col gap-4">
          {seccion === 'dinero' && <>
          {/* Lo primero que mira el dueño: cómo viene el mes y si mejora o empeora. */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {/*
              Dice "facturado" y no "cobrado" a propósito: acá se cuenta todo lo que se
              vendió en el mes, incluido el consumo anotado que todavía no se pagó. La
              pantalla de Caja usa el otro criterio —solo lo que entró— y por eso los dos
              números no tienen que coincidir.
            */}
            <Indicador
              titulo="Facturado este mes"
              valor={formatearMoneda(datos.mesActual.facturado)}
              pie={datos.mesActual.variacion == null
                ? 'Sin datos del mes anterior'
                : `${datos.mesActual.variacion >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(datos.mesActual.variacion * 100))}% contra ${formatearMoneda(datos.mesActual.facturadoMesAnterior)}`}
              tono={datos.mesActual.variacion == null ? 'neutro' : datos.mesActual.variacion >= 0 ? 'bueno' : 'malo'}
            />
            <Indicador
              titulo="Resultado del mes"
              valor={formatearMoneda(datos.mesActual.resultado)}
              pie="Lo que entró menos lo que salió"
              tono={datos.mesActual.resultado >= 0 ? 'bueno' : 'malo'}
            />
            <Indicador
              titulo="Ocupación"
              valor={porcentaje(datos.mesActual.ocupacion)}
              pie={`${formatearMoneda(datos.mesActual.ingresoPorHoraAbierta)} por hora abierta`}
            />
            <Indicador
              titulo="Ticket promedio"
              valor={formatearMoneda(datos.mesActual.ticketPromedio)}
              pie={`${datos.mesActual.turnosJugados} turnos jugados`}
            />
          </div>

          {datos.mesActual.deudaAcumulada > 0 && (
            <div className="rounded-lg border border-rp-danger/40 bg-rp-danger/10 px-4 py-3 text-sm">
              <b className="text-rp-danger">Te deben {formatearMoneda(datos.mesActual.deudaAcumulada)}</b>
              <span className="text-rp-muted"> de turnos de este mes que todavía no se cobraron.</span>
            </div>
          )}
          </>}

        <div className="grid gap-4 lg:grid-cols-2">
          {seccion === 'dinero' && <>
          <Panel titulo="Ingresos y gastos por mes" icono={TrendingUp}>
            <div className="flex items-end gap-4" style={{ height: 160 }}>
              {datos.ingresosPorMes.map((mes) => (
                <div key={mes.mes} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <div className="flex h-full w-full items-end justify-center gap-0.5">
                    <div className="w-1/4 rounded-t bg-rp-accent/70" style={{ height: `${Math.max(2, (mes.turnos / maxIngreso) * 130)}px` }} title={`Turnos ${formatearMoneda(mes.turnos)}`} />
                    <div className="w-1/4 rounded-t bg-rp-amber/70" style={{ height: `${Math.max(2, (mes.inscripciones / maxIngreso) * 130)}px` }} title={`Inscripciones ${formatearMoneda(mes.inscripciones)}`} />
                    <div className="w-1/4 rounded-t bg-rp-accent/35" style={{ height: `${Math.max(2, (mes.ventas / maxIngreso) * 130)}px` }} title={`Mostrador ${formatearMoneda(mes.ventas)}`} />
                    <div className="w-1/4 rounded-t bg-rp-danger/60" style={{ height: `${Math.max(2, (mes.gastosOperativos / maxIngreso) * 130)}px` }} title={`Gastos operativos ${formatearMoneda(mes.gastosOperativos)}`} />
                  </div>
                  <span className="text-[10px] font-bold uppercase text-rp-muted">{etiquetaMes(mes.mes)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-rp-muted">
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-rp-accent/70" />Turnos</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-rp-amber/70" />Inscripciones</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-rp-accent/35" />Mostrador</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-rp-danger/60" />Gastos operativos</span>
            </div>

            <div className="mt-4 border-t border-rp-border pt-3">
              <p className="text-xs font-bold uppercase tracking-wide text-rp-muted">Resultado por mes</p>
              <div className="mt-2 flex gap-4">
                {datos.ingresosPorMes.map((mes) => (
                  <div key={mes.mes} className="flex-1 text-center">
                    <p className={`text-xs font-black ${mes.resultado < 0 ? 'text-rp-danger' : 'text-rp-text'}`}>
                      {formatearMoneda(mes.resultado)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          {/* El estado de resultados, línea por línea. Es la pantalla que contesta "¿cuánto
              me quedó?" sin que el dueño tenga que armar la cuenta de cabeza. */}
          <Panel titulo="Estado de resultados" icono={TrendingUp}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-rp-border text-left text-[10px] font-black uppercase tracking-[0.12em] text-rp-muted">
                    <th className="pb-2">Concepto</th>
                    {datos.ingresosPorMes.map((mes) => (
                      <th key={mes.mes} className="pb-2 text-right">{etiquetaMes(mes.mes)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <FilaResultado titulo="Turnos" valores={datos.ingresosPorMes.map((m) => m.turnos)} />
                  <FilaResultado titulo="Inscripciones" valores={datos.ingresosPorMes.map((m) => m.inscripciones)} />
                  <FilaResultado titulo="Mostrador" valores={datos.ingresosPorMes.map((m) => m.ventas)} />
                  <FilaResultado titulo="Ingresos" valores={datos.ingresosPorMes.map((m) => m.ingresos)} destacada />
                  <FilaResultado titulo="Costo de lo vendido" valores={datos.ingresosPorMes.map((m) => -m.costoMercaderia)} />
                  <FilaResultado titulo="Ganancia bruta" valores={datos.ingresosPorMes.map((m) => m.gananciaBruta)} destacada />
                  <FilaResultado titulo="Gastos operativos" valores={datos.ingresosPorMes.map((m) => -m.gastosOperativos)} />
                  <FilaResultado titulo="Resultado" valores={datos.ingresosPorMes.map((m) => m.resultado)} destacada resaltarNegativo />
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-rp-muted">
              El <b className="text-rp-text">costo de lo vendido</b> es lo que costó la mercadería que
              efectivamente se vendió. La mercadería comprada y todavía no vendida no es un gasto:
              es capital en stock.
              {datos.ingresosPorMes.some((m) => m.comprasMercaderia > 0) && (
                <> Este semestre se compró mercadería por{' '}
                  <b className="text-rp-text">
                    {formatearMoneda(datos.ingresosPorMes.reduce((suma, m) => suma + m.comprasMercaderia, 0))}
                  </b>.
                </>
              )}
            </p>
          </Panel>
          </>}

          {seccion === 'turnos' && <>
          {/* Estaba en el Panel mostrando solo la semana en curso. Acá, sobre los seis
              meses, dice algo que sirve: qué días llenan la cancha y cuáles no. */}
          <Panel titulo="Qué días se llena la cancha" icono={CalendarDays} className="lg:col-span-2">
            {turnosPorDia.total === 0 ? (
              <p className="py-4 text-center text-sm text-rp-muted">Sin turnos registrados en el período.</p>
            ) : (
              <div className="flex items-end gap-2 sm:gap-4" style={{ height: 150 }}>
                {turnosPorDia.barras.map((barra) => (
                  <div key={barra.dia} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-xs font-bold text-rp-muted">{barra.cantidad}</span>
                    <div
                      className={barra.cantidad === turnosPorDia.maximo ? 'w-full rounded-t bg-rp-accent' : 'w-full rounded-t bg-rp-accent/45'}
                      style={{ height: `${Math.max(2, (barra.cantidad / turnosPorDia.maximo) * 100)}px` }}
                    />
                    <span className="text-[10px] font-bold uppercase text-rp-muted">{barra.dia}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel titulo="Tasa de cancelación" icono={Percent}>
            <div className="flex h-full flex-col justify-center">
              <p className="text-5xl font-black text-rp-text">{Math.round(datos.tasaCancelacion * 100)}%</p>
              <p className="mt-2 text-sm text-rp-muted">
                {datos.reservasCanceladas} de {datos.reservasTotales} turnos se cancelaron, rechazaron o expiraron.
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-rp-surface-2">
                <div className="h-full rounded-full bg-rp-danger" style={{ width: `${Math.min(100, datos.tasaCancelacion * 100)}%` }} />
              </div>

              <div className="mt-5 border-t border-rp-border pt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-rp-muted">No vinieron</p>
                <p className="mt-1 text-2xl font-black text-rp-text">
                  {Math.round(datos.tasaNoShow * 100)}%
                  <span className="ml-2 text-sm font-bold text-rp-muted">({datos.reservasNoShow} turnos)</span>
                </p>
                <p className="mt-1 text-xs text-rp-muted">
                  Reservaron, no avisaron y la cancha quedó bloqueada.
                </p>
              </div>
            </div>
          </Panel>

          <Panel titulo="Horarios que más se venden" icono={CalendarClock} className="lg:col-span-2">
            {rangoHoras.length === 0 ? (
              <p className="py-6 text-center text-sm text-rp-muted">Sin turnos registrados en el período.</p>
            ) : (
              <>
                <SegmentedToggle
                  valor={diaElegido}
                  onChange={setDiaElegido}
                  opciones={[{ valor: 'todos', label: 'Toda la semana' },
                    ...DIAS.map((dia, indice) => ({ valor: String(indice + 1), label: dia }))]}
                />

                {horasDelDia.total === 0 ? (
                  <p className="py-6 text-center text-sm text-rp-muted">
                    No se vendió ni un turno {diaElegido === 'todos' ? 'en el período' : 'ese día'}.
                  </p>
                ) : (
                  <>
                    <p className="mt-4 text-sm text-rp-muted">
                      La hora más vendida es <b className="text-rp-text">las {horasDelDia.pico?.hora}:00</b>, con{' '}
                      <b className="text-rp-text">{horasDelDia.pico?.cantidad} turnos</b>. Las barras cortas son las horas
                      que todavía tenés para llenar.
                    </p>
                    <ul className="mt-4 flex flex-col gap-1.5">
                      {horasDelDia.barras.map((barra) => (
                        <li key={barra.hora} className="flex items-center gap-3">
                          <span className="w-12 shrink-0 text-right text-xs font-bold text-rp-muted">{barra.hora}:00</span>
                          <div className="h-5 flex-1 overflow-hidden rounded bg-rp-surface-2">
                            <div
                              className={barra.cantidad === horasDelDia.pico?.cantidad ? 'h-full rounded bg-rp-accent' : 'h-full rounded bg-rp-accent/45'}
                              style={{ width: `${Math.max(barra.cantidad > 0 ? 3 : 0, (barra.cantidad / (horasDelDia.pico?.cantidad ?? 1)) * 100)}%` }}
                            />
                          </div>
                          <span className="w-20 shrink-0 text-xs font-bold text-rp-text">
                            {barra.cantidad} {barra.cantidad === 1 ? 'turno' : 'turnos'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </Panel>

          {/* Ocupación real, no cantidad de reservas: 40 turnos en una cancha que abre
              todo el día es peor que 20 en una que abre media jornada. */}
          <Panel titulo="Ocupación por cancha" icono={BarChart3}>
            {datos.ocupacionPorCancha.length === 0 ? (
              <p className="py-4 text-center text-sm text-rp-muted">Sin canchas con horario cargado.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {datos.ocupacionPorCancha.map((cancha) => (
                  <li key={cancha.canchaNombre}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-bold text-rp-text">{cancha.canchaNombre}</span>
                      <span className="font-black text-rp-accent">{porcentaje(cancha.ocupacion)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-rp-surface-2">
                      <div className="h-full rounded-full bg-rp-accent/70" style={{ width: `${Math.min(100, cancha.ocupacion * 100)}%` }} />
                    </div>
                    <p className="mt-0.5 text-[11px] text-rp-muted">
                      {cancha.horasVendidas} de {cancha.horasDisponibles} horas abiertas · {formatearMoneda(cancha.facturado)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          </>}

          {seccion === 'dinero' && <>
          {/* La caja del club es una sola: el kiosco no se parte por sede aunque haya
              un filtro activo arriba. Se aclara para que nadie lea estos números como
              si fueran de la sede elegida. */}
          <Panel titulo="Qué deja el kiosco (todo el club)" icono={Package}>
            <div className="grid grid-cols-2 gap-3">
              <Mini titulo="Facturado" valor={formatearMoneda(datos.kiosco.facturado)} />
              <Mini titulo="Ganancia" valor={formatearMoneda(datos.kiosco.ganancia)} destacado />
              <Mini titulo="Capital en stock" valor={formatearMoneda(datos.kiosco.capitalEnStock)} />
              <Mini titulo="Bajo mínimo" valor={String(datos.kiosco.productosBajoMinimo)} alerta={datos.kiosco.productosBajoMinimo > 0} />
            </div>
            {datos.rendimientoProductos.length === 0 ? (
              <p className="mt-4 text-sm text-rp-muted">Todavía no se vendió nada en el mostrador.</p>
            ) : (
              <>
                <p className="mt-4 text-xs font-bold uppercase tracking-wide text-rp-muted">
                  Lo que más deja (por ganancia, no por venta)
                </p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {datos.rendimientoProductos.map((producto) => (
                    <li key={producto.productoId} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate text-rp-text">
                        {producto.nombre}
                        <span className="ml-1.5 text-xs text-rp-muted">{producto.unidades} u.</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="font-bold text-rp-accent">{formatearMoneda(producto.ganancia)}</span>
                        {producto.margen != null && (
                          <span className="ml-1.5 text-xs text-rp-muted">{Math.round(producto.margen * 100)}%</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>

          <Panel titulo="Los que más gastan" icono={Users}>
            {datos.mejoresClientes.length === 0 ? (
              <p className="py-4 text-center text-sm text-rp-muted">Sin turnos jugados en el período.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {datos.mejoresClientes.map((cliente) => (
                  <li key={cliente.clienteId} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-rp-text">
                      {cliente.nombre}
                      <span className="ml-1.5 text-xs text-rp-muted">{cliente.turnos} turnos</span>
                    </span>
                    <span className="shrink-0 font-bold text-rp-accent">{formatearMoneda(cliente.gastado)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          </>}

          {seccion === 'torneos' && <>
          {datos.categoriasDemandadas.length > 0 && (
            <Panel titulo="Categorías más demandadas" icono={BarChart3}>
              <ul className="flex flex-col gap-2">
                {datos.categoriasDemandadas.map((categoria) => (
                  <li key={categoria.categoriaNombre}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-bold text-rp-text">{categoria.categoriaNombre}</span>
                      <span className="font-black text-rp-accent">{categoria.inscriptos}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-rp-surface-2">
                      <div className="h-full rounded-full bg-rp-amber/70" style={{ width: `${(categoria.inscriptos / maxCategoria) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel titulo="Torneos abiertos: cupo e inscripciones" icono={Trophy} className="lg:col-span-2">
            {datos.embudoTorneos.length === 0 ? (
              <p className="py-4 text-center text-sm text-rp-muted">No hay torneos abiertos.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {datos.embudoTorneos.map((torneo) => (
                  <li key={torneo.torneoId} className="rounded-md border border-rp-border bg-rp-bg/40 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-bold text-rp-text">
                        {torneo.torneoNombre}
                        <span className="ml-2 text-xs font-semibold text-rp-muted">
                          {torneo.inscriptos}{torneo.cupo ? ` / ${torneo.cupo}` : ''} parejas en total
                        </span>
                      </span>
                      <span className="text-sm font-black text-rp-accent">{formatearMoneda(torneo.ingresos)}</span>
                    </div>

                    {torneo.categorias.length === 0 ? (
                      <p className="mt-2 text-xs text-rp-muted">El torneo todavía no tiene categorías cargadas.</p>
                    ) : (
                      <ul className="mt-3 flex flex-col gap-2">
                        {torneo.categorias.map((categoria) => {
                          const completa = categoria.cupo != null && categoria.inscriptos >= categoria.cupo
                          const porcentaje = categoria.cupo && categoria.cupo > 0
                            ? Math.min(100, (categoria.inscriptos / categoria.cupo) * 100)
                            : 0
                          return (
                            <li key={categoria.categoriaId} className="flex items-center gap-3">
                              <span className="w-28 shrink-0 truncate text-xs font-bold text-rp-text" title={categoria.categoriaNombre}>
                                {categoria.categoriaNombre}
                              </span>
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-rp-surface-2">
                                <div
                                  className={completa ? 'h-full rounded-full bg-rp-accent' : 'h-full rounded-full bg-rp-accent/60'}
                                  style={{ width: `${porcentaje}%` }}
                                />
                              </div>
                              <span className="w-24 shrink-0 text-right text-xs font-bold text-rp-muted">
                                {categoria.inscriptos}{categoria.cupo != null ? ` / ${categoria.cupo}` : ''}
                                {completa ? <span className="ml-1 text-rp-accent">·llena</span> : null}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          </>}
        </div>
        </div>
      )}
    </section>
  )
}

/** Número grande del encabezado, con su comparación abajo. */
function Indicador({ titulo, valor, pie, tono = 'neutro' }: {
  titulo: string
  valor: string
  pie: string
  tono?: 'neutro' | 'bueno' | 'malo'
}) {
  const colorPie = tono === 'bueno' ? 'text-rp-accent' : tono === 'malo' ? 'text-rp-danger' : 'text-rp-muted'
  return (
    <div className="rounded-lg border border-rp-border bg-rp-surface/82 p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-rp-muted">{titulo}</p>
      <p className="mt-1 text-2xl font-black text-rp-text">{valor}</p>
      <p className={`mt-0.5 text-xs font-bold ${colorPie}`}>{pie}</p>
    </div>
  )
}

/**
 * Una línea del estado de resultados. Los importes que restan se pasan en negativo y se
 * muestran entre paréntesis, que es como se leen los egresos en cualquier balance.
 */
function FilaResultado({ titulo, valores, destacada = false, resaltarNegativo = false }: {
  titulo: string
  valores: number[]
  destacada?: boolean
  resaltarNegativo?: boolean
}) {
  return (
    <tr className={destacada ? 'border-t border-rp-border' : ''}>
      <td className={`py-1.5 pr-3 ${destacada ? 'text-sm font-black text-rp-text' : 'text-xs text-rp-muted'}`}>
        {titulo}
      </td>
      {valores.map((valor, i) => (
        <td
          key={i}
          className={`py-1.5 text-right tabular-nums ${destacada ? 'text-sm font-black' : 'text-xs'} ${
            resaltarNegativo && valor < 0 ? 'text-rp-danger' : destacada ? 'text-rp-text' : 'text-rp-muted'
          }`}
        >
          {valor < 0 ? `(${formatearMoneda(Math.abs(valor))})` : formatearMoneda(valor)}
        </td>
      ))}
    </tr>
  )
}

function Mini({ titulo, valor, destacado = false, alerta = false }: {
  titulo: string
  valor: string
  destacado?: boolean
  alerta?: boolean
}) {
  return (
    <div className={`rounded-md border px-3 py-2 ${alerta ? 'border-rp-amber/40 bg-rp-amber/10' : 'border-rp-border bg-rp-bg/40'}`}>
      <p className="text-[10px] font-black uppercase tracking-wide text-rp-muted">{titulo}</p>
      <p className={`mt-0.5 text-base font-black ${destacado ? 'text-rp-accent' : 'text-rp-text'}`}>{valor}</p>
    </div>
  )
}

function Panel({ titulo, icono: Icono, children, className }: { titulo: string; icono: typeof Trophy; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-rp-border bg-rp-surface/82 p-4 ${className ?? ''}`}>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-rp-accent">
        <Icono size={15} />{titulo}
      </h3>
      {children}
    </div>
  )
}
