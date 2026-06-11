import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { adminUsersApi } from '@/features/admin/adminUsersApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { coincidePrefijoNombre } from '@/shared/lib/tournamentView'
import type { AdminUserRequest, AdminUserResponse } from '@/shared/types/api'
import { AdminPageHeader } from '@/shared/ui/AdminPageHeader'
import { AdminTable, type Column } from '@/shared/ui/AdminTable'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Pagination } from '@/shared/ui/Pagination'

const TAMANO_PAGINA = 8
const VACIO: AdminUserRequest = { username: '', password: '' }

export default function AdminUsersPage() {
  const [elementos, setElementos] = useState<AdminUserResponse[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [objetivoEdicion, setObjetivoEdicion] = useState<AdminUserResponse | null>(null)
  const [formulario, setFormulario] = useState<AdminUserRequest>(VACIO)
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [objetivoEliminar, setObjetivoEliminar] = useState<AdminUserResponse | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const refScrollY = useRef(0)

  function cargar() {
    refScrollY.current = window.scrollY
    setCargando(true)
    adminUsersApi.getAll()
      .then((datos) => {
        setElementos(datos)
        setError(null)
      })
      .catch((errorCapturado: unknown) => setError(obtenerMensajeErrorApi(errorCapturado)))
      .finally(() => {
        setCargando(false)
        requestAnimationFrame(() => window.scrollTo(0, refScrollY.current))
      })
  }

  useEffect(cargar, [])
  useEffect(() => setPagina(1), [busqueda])

  const filtrados = useMemo(() => elementos
    .filter((usuario) => coincidePrefijoNombre(usuario.username, busqueda))
    .sort((a, b) => a.username.localeCompare(b.username, 'es', { sensitivity: 'base' })), [elementos, busqueda])

  const paginados = filtrados.slice((pagina - 1) * TAMANO_PAGINA, pagina * TAMANO_PAGINA)

  function abrirCrear() {
    setObjetivoEdicion(null)
    setFormulario(VACIO)
    setErrorFormulario(null)
    setModalAbierto(true)
  }

  function abrirEditar(usuario: AdminUserResponse) {
    setObjetivoEdicion(usuario)
    setFormulario({ username: usuario.username, password: '' })
    setErrorFormulario(null)
    setModalAbierto(true)
  }

  function cerrarModal() {
    setModalAbierto(false)
    setErrorFormulario(null)
  }

  async function manejarGuardar() {
    const usuario = formulario.username.trim()
    const contrasena = formulario.password?.trim() ?? ''

    if (!usuario) {
      setErrorFormulario('El usuario es obligatorio.')
      return
    }
    if (!objetivoEdicion && contrasena.length < 6) {
      setErrorFormulario('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (objetivoEdicion && contrasena && contrasena.length < 6) {
      setErrorFormulario('La nueva contraseña debe tener al menos 6 caracteres.')
      return
    }

    const datos: AdminUserRequest = { username: usuario }
    if (contrasena) datos.password = contrasena

    setGuardando(true)
    setErrorFormulario(null)
    try {
      if (objetivoEdicion) {
        await adminUsersApi.update(objetivoEdicion.id, datos)
      } else {
        await adminUsersApi.create(datos)
      }
      cerrarModal()
      cargar()
    } catch (errorCapturado: unknown) {
      setErrorFormulario(obtenerMensajeErrorApi(errorCapturado))
    } finally {
      setGuardando(false)
    }
  }

  async function manejarEliminar() {
    if (!objetivoEliminar) return
    setEliminando(true)
    try {
      await adminUsersApi.remove(objetivoEliminar.id)
      setObjetivoEliminar(null)
      cargar()
    } catch (errorCapturado: unknown) {
      setError(obtenerMensajeErrorApi(errorCapturado))
      setObjetivoEliminar(null)
    } finally {
      setEliminando(false)
    }
  }

  const columnas = useMemo(() => [
    {
      key: 'username',
      label: 'Usuario',
      render: (usuario: AdminUserResponse) => (
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} className="text-rp-accent" />
          <span className="text-sm font-bold text-rp-text">{usuario.username}</span>
        </div>
      ),
    },
  ] as Column<AdminUserResponse>[], [])

  return (
    <section>
      <AdminPageHeader title="Usuarios admin" action={<Button size="sm" onClick={abrirCrear}><Plus size={16} />Nuevo admin</Button>} />

      <div className="rp-toolbar">
        <Input placeholder="Buscar por usuario..." value={busqueda} onChange={(event) => setBusqueda(event.target.value)} />
      </div>

      <div className="mt-4">
        <AdminTable
          columns={columnas}
          rows={paginados}
          getRowKey={(usuario) => usuario.id}
          isLoading={cargando}
          error={error}
          emptyTitle="No hay usuarios admin"
          emptyDescription="Creá el primero con el botón de arriba."
          actions={(usuario) => (
            <>
              <button onClick={() => abrirEditar(usuario)} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent"><Pencil size={15} /></button>
              <button onClick={() => setObjetivoEliminar(usuario)} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger"><Trash2 size={15} /></button>
            </>
          )}
        />
        <Pagination page={pagina} pageSize={TAMANO_PAGINA} total={filtrados.length} onPageChange={setPagina} />
      </div>

      <Modal isOpen={modalAbierto} onClose={cerrarModal} title={objetivoEdicion ? 'Editar admin' : 'Nuevo admin'} size="sm">
        <div className="flex flex-col gap-4">
          <Input label="Usuario" value={formulario.username} onChange={(event) => setFormulario((actual) => ({ ...actual, username: event.target.value }))} placeholder="admin" />
          <Input
            label={objetivoEdicion ? 'Nueva contraseña (opcional)' : 'Contraseña'}
            type="password"
            value={formulario.password ?? ''}
            onChange={(event) => setFormulario((actual) => ({ ...actual, password: event.target.value }))}
            placeholder="Mínimo 6 caracteres"
          />
          {objetivoEdicion ? <p className="text-xs leading-5 text-rp-muted">Dejá la contraseña vacía si no querés cambiarla.</p> : null}
          {errorFormulario && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorFormulario}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={cerrarModal} disabled={guardando}>Cancelar</Button>
            <Button size="sm" onClick={manejarGuardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(objetivoEliminar)}
        onClose={() => setObjetivoEliminar(null)}
        onConfirm={manejarEliminar}
        title="Eliminar admin"
        description={`¿Eliminás el usuario "${objetivoEliminar?.username}"?`}
        isLoading={eliminando}
      />
    </section>
  )
}
