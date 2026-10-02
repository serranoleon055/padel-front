import { Contact, Pencil, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { clientesApi, type ClienteFicha, type ClienteResponse, type SeguimientoCliente, type TipoSeguimiento } from '@/features/clientes/clientesApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { formatearEnum, formatearFecha, formatearMoneda } from '@/shared/lib/formatters'
import { TelefonoWhatsApp } from '@/shared/ui/TelefonoWhatsApp'
import { Upload } from 'lucide-react'

import { ImportarCsvModal } from '@/pages/admin/ImportarCsvModal'
import { AdminPageHeader } from '@/shared/ui/AdminPageHeader'
import { AdminTable, type Column } from '@/shared/ui/AdminTable'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Pagination } from '@/shared/ui/Pagination'
import { SegmentedToggle } from '@/shared/ui/SegmentedToggle'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { useToast } from '@/shared/ui/Toast'
import { usePaginaEnUrl, useReiniciarPaginaAlFiltrar } from '@/shared/lib/paginacion'

const TAMANO_PAGINA = 20
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

type Vista = 'todos' | TipoSeguimiento
type FilaSeguimiento = SeguimientoCliente & { id: number }

/**
 * Las listas de seguimiento, con su ventana y el texto que explica para qué sirve cada
 * una. La ventana es parte de la definición: "se enfrió" a los 45 días y "es nuevo" a los
 * 30 son criterios distintos, no el mismo número mirado de dos formas.
 */
const SEGUIMIENTOS: Record<TipoSeguimiento, { label: string; dias: number; explicacion: string }> = {
  DORMIDOS: {
    label: 'Se enfriaron',
    dias: 45,
    explicacion: 'Venían seguido y hace más de 45 días que no aparecen. Los de arriba son los que se fueron hace menos: son los más fáciles de recuperar.',
  },
  MEJORES: {
    label: 'Los que más dejan',
    dias: 180,
    explicacion: 'Los que más gastaron en los últimos 6 meses. Son los que hay que cuidar antes de que se los lleve otro club.',
  },
  NUEVOS: {
    label: 'Nuevos',
    dias: 30,
    explicacion: 'Jugaron por primera vez en los últimos 30 días. El mensaje ahora es lo que decide si vuelven una segunda vez.',
  },
}

function toneReserva(estado: string | null): 'neutral' | 'success' | 'warning' | 'danger' {
  if (estado === 'CONFIRMADA' || estado === 'FINALIZADA') return 'success'
  if (estado === 'PENDIENTE') return 'warning'
  if (estado === 'CANCELADA' || estado === 'RECHAZADA' || estado === 'EXPIRADA' || estado === 'NO_SHOW') return 'danger'
  return 'neutral'
}

export default function ClientesPage() {
  const [pagina, setPagina] = usePaginaEnUrl()
  const [busqueda, setBusqueda] = useState('')
  const [busquedaAplicada, setBusquedaAplicada] = useState('')
  const [clientes, setClientes] = useState<ClienteResponse[]>([])
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { success: avisoExito } = useToast()

  const [ficha, setFicha] = useState<ClienteFicha | null>(null)
  const [cargandoFicha, setCargandoFicha] = useState(false)
  const [editando, setEditando] = useState(false)
  const [formulario, setFormulario] = useState({ nombre: '', telefono: '', email: '', notas: '' })
  const [guardando, setGuardando] = useState(false)
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null)
  const [importarAbierto, setImportarAbierto] = useState(false)

  // Seguimiento: las listas de "a quién escribirle". Los datos ya estaban todos en el
  // sistema; lo que faltaba era que alguien los mirara sin tener que ir cliente por
  // cliente. Cada opción trae su propia ventana de días porque miden cosas distintas.
  const [vista, setVista] = useState<Vista>('todos')
  const [seguimiento, setSeguimiento] = useState<SeguimientoCliente[]>([])
  const [cargandoSeguimiento, setCargandoSeguimiento] = useState(false)

  // La búsqueda pega al servidor: la lista de clientes crece sin techo y no se puede
  // traer entera para filtrar en el navegador.
  useEffect(() => {
    const id = setTimeout(() => setBusquedaAplicada(busqueda.trim()), 300)
    return () => clearTimeout(id)
  }, [busqueda])

  useReiniciarPaginaAlFiltrar(setPagina, [busquedaAplicada])

  useEffect(() => {
    setCargando(true)
    clientesApi.listar(busquedaAplicada, pagina - 1, TAMANO_PAGINA)
      .then((datos) => { setClientes(datos.content); setTotal(datos.totalElements); setError(null) })
      .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
      .finally(() => setCargando(false))
  }, [busquedaAplicada, pagina])

  useEffect(() => {
    if (vista === 'todos') return
    let vigente = true
    setCargandoSeguimiento(true)
    clientesApi.seguimiento(vista, SEGUIMIENTOS[vista].dias)
      .then((datos) => { if (vigente) { setSeguimiento(datos); setError(null) } })
      .catch((e: unknown) => { if (vigente) setError(obtenerMensajeErrorApi(e)) })
      .finally(() => { if (vigente) setCargandoSeguimiento(false) })
    return () => { vigente = false }
  }, [vista])

  /** Abre la ficha desde una lista de seguimiento, que solo tiene el id del cliente. */
  function abrirFichaPorId(clienteId: number) {
    setCargandoFicha(true)
    clientesApi.ficha(clienteId)
      .then(setFicha)
      .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
      .finally(() => setCargandoFicha(false))
  }

  function abrirFicha(cliente: ClienteResponse) {
    setCargandoFicha(true)
    // Se muestra lo que ya se sabe del listado y el resto entra cuando responde la API.
    setFicha({
      cliente,
      historial: [],
      otrosNombres: [],
      deuda: 0,
      consumoKiosco: 0,
      ultimasCompras: [],
      abonos: [],
    })
    clientesApi.ficha(cliente.id)
      .then(setFicha)
      .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
      .finally(() => setCargandoFicha(false))
  }

  function abrirEdicion(cliente: ClienteResponse) {
    setFormulario({
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      email: cliente.email ?? '',
      notas: cliente.notas ?? '',
    })
    setErrorFormulario(null)
    setEditando(true)
  }

  async function guardar() {
    if (!ficha) return
    if (!formulario.nombre.trim() || !formulario.telefono.trim()) {
      setErrorFormulario('El nombre y el teléfono son obligatorios.'); return
    }
    setGuardando(true); setErrorFormulario(null)
    try {
      await clientesApi.actualizar(ficha.cliente.id, {
        nombre: formulario.nombre.trim(),
        telefono: formulario.telefono.trim(),
        email: formulario.email.trim() || null,
        notas: formulario.notas.trim() || null,
      })
      setEditando(false)
      setFicha(null)
      const datos = await clientesApi.listar(busquedaAplicada, pagina - 1, TAMANO_PAGINA)
      setClientes(datos.content)
      avisoExito('Ficha actualizada')
    } catch (e: unknown) {
      setErrorFormulario(obtenerMensajeErrorApi(e))
    } finally { setGuardando(false) }
  }

  const columnas = useMemo(() => [
    {
      key: 'cliente',
      label: 'Cliente',
      render: (cliente: ClienteResponse) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-rp-text">{cliente.nombre}</span>
            {cliente.esJugador && (
              <span title="También es jugador de torneos" className="text-rp-accent"><Trophy size={13} /></span>
            )}
          </div>
          <TelefonoWhatsApp telefono={cliente.telefono} mensaje={`Hola ${cliente.nombre}!`} />
        </div>
      ),
    },
    {
      key: 'turnos',
      label: 'Turnos',
      render: (cliente: ClienteResponse) => (
        <div>
          <p className="text-sm font-bold text-rp-text">{cliente.turnosJugados} jugados</p>
          <p className="text-xs text-rp-muted">
            {cliente.turnosCaidos} caídos · {cliente.turnosTotales} en total
            {cliente.turnosNoShow > 0 && (
              <span className="ml-1 font-bold text-rp-danger">· {cliente.turnosNoShow} sin avisar</span>
            )}
          </p>
        </div>
      ),
    },
    {
      key: 'gasto',
      // Suma TODO lo confirmado o jugado, sin límite de fecha — incluye turnos futuros
      // ya confirmados. Es distinto del "Lo que más dejan" de Estadísticas, que solo
      // mira hasta hoy y los últimos 6 meses. Los dos números están bien; miden cosas
      // distintas a propósito.
      label: 'Gasto acumulado (histórico)',
      render: (cliente: ClienteResponse) => <span className="text-sm text-rp-muted">{formatearMoneda(cliente.gastoAcumulado)}</span>,
    },
    {
      key: 'ultimo',
      label: 'Último turno',
      render: (cliente: ClienteResponse) => (
        <span className="text-sm text-rp-muted">{cliente.ultimoTurno ? formatearFecha(cliente.ultimoTurno) : '-'}</span>
      ),
    },
  ] as Column<ClienteResponse>[], [])

  /**
   * El mensaje de WhatsApp llega escrito pero NO se manda solo: lo lee una persona del
   * club antes de enviarlo. Es lo que se puede hacer sin la API paga de WhatsApp, y
   * además es lo que el club quiere — el texto se ajusta según a quién le escribe.
   */
  const columnasSeguimiento = useMemo(() => [
    {
      key: 'cliente',
      label: 'Cliente',
      render: (fila: FilaSeguimiento) => (
        <div>
          <span className="text-sm font-bold text-rp-text">{fila.nombre}</span>
          <TelefonoWhatsApp
            telefono={fila.telefono}
            mensaje={vista === 'NUEVOS'
              ? `Hola ${fila.nombre}! Gracias por venir a jugar. Cuando quieras tu próximo turno, avisanos.`
              : `Hola ${fila.nombre}! ¿Te armamos una cancha esta semana?`}
          />
        </div>
      ),
    },
    {
      key: 'cuando',
      label: vista === 'NUEVOS' ? 'Primera vez' : 'Último turno',
      render: (fila: FilaSeguimiento) => (
        <div>
          <p className="text-sm font-bold text-rp-text">
            {formatearFecha(vista === 'NUEVOS' ? fila.primerTurno : fila.ultimoTurno)}
          </p>
          {vista !== 'NUEVOS' && (
            <p className="text-xs text-rp-muted">hace {fila.diasSinVenir} días</p>
          )}
        </div>
      ),
    },
    {
      key: 'turnos',
      label: 'Turnos',
      render: (fila: FilaSeguimiento) => <span className="text-sm text-rp-muted">{fila.turnos}</span>,
    },
    {
      key: 'gastado',
      label: 'Gastó',
      render: (fila: FilaSeguimiento) => <span className="text-sm text-rp-muted">{formatearMoneda(fila.gastado)}</span>,
    },
  ] as Column<FilaSeguimiento>[], [vista])

  // AdminTable identifica las filas por `id`; acá el identificador es el del cliente.
  const filasSeguimiento = useMemo<FilaSeguimiento[]>(
    () => seguimiento.map((fila) => ({ ...fila, id: fila.clienteId })),
    [seguimiento],
  )

  return (
    <section>
      <AdminPageHeader
        title={<><Contact size={26} />Clientes</>}
        action={<Button variant="ghost" size="sm" onClick={() => setImportarAbierto(true)}><Upload size={16} />Importar</Button>}
      />

      <ImportarCsvModal
        tipo="clientes"
        abierto={importarAbierto}
        onClose={() => setImportarAbierto(false)}
        onImportado={() => clientesApi.listar(busquedaAplicada, pagina - 1, TAMANO_PAGINA)
          .then((datos) => { setClientes(datos.content); setTotal(datos.totalElements) })
          .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))}
      />

      <p className="mt-3 max-w-2xl text-sm text-rp-muted">
        {vista === 'todos'
          ? 'La ficha se arma sola con cada turno: el teléfono identifica a la persona aunque lo escriba distinto cada vez. Tocá una fila para ver su historial.'
          : SEGUIMIENTOS[vista].explicacion}
      </p>

      <SegmentedToggle
        className="mt-4"
        valor={vista}
        onChange={setVista}
        opciones={[
          { valor: 'todos' as Vista, label: 'Todos' },
          ...(Object.keys(SEGUIMIENTOS) as TipoSeguimiento[])
            .map((clave) => ({ valor: clave as Vista, label: SEGUIMIENTOS[clave].label })),
        ]}
      />

      {vista === 'todos' ? (
        <>
          <div className="mt-4 w-full sm:w-72">
            <Input placeholder="Buscar por nombre o teléfono..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>

          <div className="mt-4">
            <AdminTable
              columns={columnas}
              rows={clientes}
              getRowKey={(cliente) => cliente.id}
              isLoading={cargando}
              error={error}
              emptyTitle="No hay clientes"
              emptyDescription="Se cargan solos cuando entra el primer turno."
              actions={(cliente) => (
                <button onClick={() => abrirFicha(cliente)} className="rounded-md px-2 py-1 text-xs font-bold text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent">
                  Ver ficha
                </button>
              )}
            />
            <Pagination page={pagina} pageSize={TAMANO_PAGINA} total={total} onPageChange={setPagina} />
          </div>
        </>
      ) : (
        <div className="mt-4">
          <AdminTable
            columns={columnasSeguimiento}
            rows={filasSeguimiento}
            getRowKey={(fila) => fila.clienteId}
            isLoading={cargandoSeguimiento}
            error={error}
            emptyTitle="No hay nadie en esta lista"
            emptyDescription="Es una buena noticia: nadie se enfrió en la ventana que mira esta pantalla."
            actions={(fila) => (
              <button onClick={() => abrirFichaPorId(fila.clienteId)} className="rounded-md px-2 py-1 text-xs font-bold text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent">
                Ver ficha
              </button>
            )}
          />
        </div>
      )}

      <Modal isOpen={Boolean(ficha) && !editando} onClose={() => setFicha(null)} title={ficha?.cliente.nombre ?? ''} size="lg">
        {ficha && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-rp-muted">Turnos jugados</p>
                  <p className="text-lg font-black text-rp-text">{ficha.cliente.turnosJugados}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-rp-muted">Caídos</p>
                  <p className="text-lg font-black text-rp-text">{ficha.cliente.turnosCaidos}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-rp-muted">No vino</p>
                  <p className={`text-lg font-black ${ficha.cliente.turnosNoShow > 0 ? 'text-rp-danger' : 'text-rp-text'}`}>
                    {ficha.cliente.turnosNoShow}
                  </p>
                </div>
                <div>
                  <p
                    className="text-xs font-bold uppercase tracking-wide text-rp-muted"
                    title="Suma todo lo confirmado o jugado, sin límite de fecha (incluye turnos futuros ya confirmados)."
                  >
                    Gasto acumulado (histórico)
                  </p>
                  <p className="text-lg font-black text-rp-text">{formatearMoneda(ficha.cliente.gastoAcumulado)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-rp-muted">Último turno</p>
                  <p className="text-lg font-black text-rp-text">{ficha.cliente.ultimoTurno ? formatearFecha(ficha.cliente.ultimoTurno) : '-'}</p>
                </div>
              </div>
              <Button size="sm" variant="subtle" onClick={() => abrirEdicion(ficha.cliente)}><Pencil size={15} />Editar ficha</Button>
            </div>

            <div className="text-sm text-rp-muted">
              <p>{ficha.cliente.telefono}{ficha.cliente.email ? ` · ${ficha.cliente.email}` : ''}</p>
              {ficha.cliente.notas && <p className="mt-1 italic">{ficha.cliente.notas}</p>}
            </div>

            {ficha.otrosNombres?.length > 0 && (
              <div className="rounded-md border border-rp-border bg-rp-surface-2 px-3 py-2">
                <p className="text-xs font-bold uppercase tracking-wide text-rp-muted">
                  Este teléfono también reservó como
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ficha.otrosNombres.map((nombre) => (
                    <button
                      key={nombre}
                      type="button"
                      onClick={() => { abrirEdicion({ ...ficha.cliente, nombre }) }}
                      title="Usar este nombre en la ficha"
                      className="rounded-full border border-rp-border px-2.5 py-1 text-xs font-bold text-rp-text hover:border-rp-accent hover:text-rp-accent"
                    >
                      {nombre}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-rp-muted">
                  Tocá un nombre para dejarlo como el principal de la ficha.
                </p>
              </div>
            )}

            {ficha.deuda > 0 && (
              <div className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm">
                <b className="text-rp-danger">Debe {formatearMoneda(ficha.deuda)}</b>
                <span className="text-rp-muted"> entre canchas y consumo sin cobrar.</span>
              </div>
            )}

            {ficha.abonos?.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-rp-muted">Abonos</p>
                <div className="flex flex-wrap gap-2">
                  {ficha.abonos.map((abono) => (
                    <span
                      key={abono.id}
                      className={abono.activo
                        ? 'rounded-md border border-rp-accent/40 bg-rp-accent/10 px-2.5 py-1.5 text-xs font-bold text-rp-text'
                        : 'rounded-md border border-rp-border px-2.5 py-1.5 text-xs text-rp-muted line-through'}
                    >
                      {DIAS_SEMANA[abono.diaSemana - 1]} {abono.horaInicio.slice(0, 5)}-{abono.horaFin.slice(0, 5)}
                      <span className="ml-1.5 font-semibold text-rp-muted">{abono.canchaNombre}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {ficha.ultimasCompras?.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-rp-muted">
                  Consumo del kiosco
                  <span className="ml-2 font-black text-rp-accent">{formatearMoneda(ficha.consumoKiosco)}</span>
                  <span className="ml-1 font-semibold normal-case text-rp-muted">en el último año</span>
                </p>
                <div className="max-h-40 overflow-y-auto">
                  {ficha.ultimasCompras.map((compra) => (
                    <div key={compra.id} className="flex items-center justify-between gap-2 border-b border-rp-border py-1.5 last:border-0">
                      <span className="min-w-0 truncate text-sm text-rp-text">
                        {compra.detalle}
                        <span className="ml-1.5 text-xs text-rp-muted">{formatearFecha(compra.fecha.slice(0, 10))}</span>
                      </span>
                      <span className="shrink-0 text-sm font-bold text-rp-text">{formatearMoneda(compra.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-rp-muted">Historial</p>
              {cargandoFicha && <p className="text-sm text-rp-muted">Cargando...</p>}
              {!cargandoFicha && ficha.historial.length === 0 && <p className="text-sm text-rp-muted">Sin turnos registrados.</p>}
              <div className="max-h-80 overflow-y-auto">
                {ficha.historial.map((reserva) => (
                  <div key={reserva.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-rp-border py-2 last:border-0">
                    <div>
                      <p className="text-sm font-bold text-rp-text">{formatearFecha(reserva.fecha)} · {reserva.horaInicio?.slice(0, 5)}</p>
                      <p className="text-xs text-rp-muted">
                        {reserva.canchaNombre}
                        {reserva.turnoFijo ? ' · turno fijo' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {reserva.precioAplicado != null && (
                        <span className="text-xs text-rp-muted">{formatearMoneda(reserva.precioAplicado)}</span>
                      )}
                      <StatusBadge tone={toneReserva(reserva.estado)}>{formatearEnum(reserva.estado ?? '')}</StatusBadge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={editando} onClose={() => setEditando(false)} onSubmit={guardar} title="Editar ficha" size="sm">
        <div className="flex flex-col gap-4">
          <Input label="Nombre" value={formulario.nombre} onChange={(e) => setFormulario((f) => ({ ...f, nombre: e.target.value }))} />
          <Input label="Teléfono" value={formulario.telefono} onChange={(e) => setFormulario((f) => ({ ...f, telefono: e.target.value }))} />
          <Input label="Email" value={formulario.email} onChange={(e) => setFormulario((f) => ({ ...f, email: e.target.value }))} />
          <Input label="Notas internas" value={formulario.notas} onChange={(e) => setFormulario((f) => ({ ...f, notas: e.target.value }))} placeholder="Paga en efectivo" />
          {errorFormulario && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorFormulario}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setEditando(false)} disabled={guardando}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </div>
      </Modal>
    </section>
  )
}
