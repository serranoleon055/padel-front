import { Contact, Pencil, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { clientesApi, type ClienteFicha, type ClienteResponse } from '@/features/clientes/clientesApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { formatearEnum, formatearFecha, formatearMoneda } from '@/shared/lib/formatters'
import { enlaceWhatsApp } from '@/shared/lib/whatsapp'
import { AdminPageHeader } from '@/shared/ui/AdminPageHeader'
import { AdminTable, type Column } from '@/shared/ui/AdminTable'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Pagination } from '@/shared/ui/Pagination'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { useToast } from '@/shared/ui/Toast'

const TAMANO_PAGINA = 20

function toneReserva(estado: string | null): 'neutral' | 'success' | 'warning' | 'danger' {
  if (estado === 'CONFIRMADA' || estado === 'FINALIZADA') return 'success'
  if (estado === 'PENDIENTE') return 'warning'
  if (estado === 'CANCELADA' || estado === 'RECHAZADA' || estado === 'EXPIRADA' || estado === 'NO_SHOW') return 'danger'
  return 'neutral'
}

export default function ClientesPage() {
  const [pagina, setPagina] = useState(1)
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

  // La búsqueda pega al servidor: la lista de clientes crece sin techo y no se puede
  // traer entera para filtrar en el navegador.
  useEffect(() => {
    const id = setTimeout(() => { setBusquedaAplicada(busqueda.trim()); setPagina(1) }, 300)
    return () => clearTimeout(id)
  }, [busqueda])

  useEffect(() => {
    setCargando(true)
    clientesApi.listar(busquedaAplicada, pagina - 1, TAMANO_PAGINA)
      .then((datos) => { setClientes(datos.content); setTotal(datos.totalElements); setError(null) })
      .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
      .finally(() => setCargando(false))
  }, [busquedaAplicada, pagina])

  function abrirFicha(cliente: ClienteResponse) {
    setCargandoFicha(true)
    setFicha({ cliente, historial: [] })
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
      setPagina((p) => p)
      setBusquedaAplicada((b) => b)
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
      render: (cliente: ClienteResponse) => {
        const enlace = enlaceWhatsApp(cliente.telefono, `Hola ${cliente.nombre}!`)
        return (
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-rp-text">{cliente.nombre}</span>
              {cliente.esJugador && (
                <span title="También es jugador de torneos" className="text-rp-accent"><Trophy size={13} /></span>
              )}
            </div>
            {enlace
              ? <a href={enlace} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-rp-muted underline-offset-2 hover:text-rp-accent hover:underline">{cliente.telefono}</a>
              : <p className="text-xs text-rp-muted">{cliente.telefono}</p>}
          </div>
        )
      },
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
      label: 'Gasto acumulado',
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

  return (
    <section>
      <AdminPageHeader title={<><Contact size={26} />Clientes</>} />

      <p className="mt-3 max-w-2xl text-sm text-rp-muted">
        La ficha se arma sola con cada turno: el teléfono identifica a la persona aunque lo
        escriba distinto cada vez. Tocá una fila para ver su historial.
      </p>

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
                  <p className="text-xs font-bold uppercase tracking-wide text-rp-muted">Gasto acumulado</p>
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
          <Input label="Email (opcional)" value={formulario.email} onChange={(e) => setFormulario((f) => ({ ...f, email: e.target.value }))} />
          <Input label="Notas internas (opcional)" value={formulario.notas} onChange={(e) => setFormulario((f) => ({ ...f, notas: e.target.value }))} placeholder="Paga siempre en efectivo, juega con..." />
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
