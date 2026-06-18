import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { canchasApi } from '@/features/catalog/catalogApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { formatearMoneda } from '@/shared/lib/formatters'
import type { CanchaResponse, LugarResponse } from '@/shared/types/api'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { useToast } from '@/shared/ui/Toast'

export function CanchasLugarModal({ lugar, onClose }: { lugar: LugarResponse | null; onClose: () => void }) {
  const { success: avisoExito } = useToast()
  const [canchas, setCanchas] = useState<CanchaResponse[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [precioPorHora, setPrecioPorHora] = useState('')
  const [seniaPorcentaje, setSeniaPorcentaje] = useState('')
  const [editando, setEditando] = useState<CanchaResponse | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [aArchivar, setAArchivar] = useState<CanchaResponse | null>(null)

  function cargar(lugarId: number) {
    setCargando(true)
    canchasApi.getAll(lugarId)
      .then((datos) => { setCanchas(datos); setError(null) })
      .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    if (!lugar) return
    setNombre('')
    setDescripcion('')
    setPrecioPorHora('')
    setSeniaPorcentaje('')
    setEditando(null)
    setError(null)
    cargar(lugar.id)
  }, [lugar])

  function empezarEdicion(cancha: CanchaResponse) {
    setEditando(cancha)
    setNombre(cancha.nombre)
    setDescripcion(cancha.descripcion ?? '')
    setPrecioPorHora(cancha.precioPorHora != null ? String(cancha.precioPorHora) : '')
    setSeniaPorcentaje(cancha.seniaPorcentaje != null ? String(cancha.seniaPorcentaje) : '')
  }

  function limpiarFormulario() {
    setEditando(null)
    setNombre('')
    setDescripcion('')
    setPrecioPorHora('')
    setSeniaPorcentaje('')
  }

  async function guardar() {
    if (!lugar || !nombre.trim()) {
      setError('El nombre de la cancha es obligatorio.')
      return
    }
    setGuardando(true)
    setError(null)
    try {
      const payload = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        lugarId: lugar.id,
        precioPorHora: precioPorHora ? Number(precioPorHora) : null,
        seniaPorcentaje: seniaPorcentaje ? Number(seniaPorcentaje) : null,
      }
      if (editando) {
        await canchasApi.update(editando.id, payload)
        avisoExito('Cancha actualizada')
      } else {
        await canchasApi.create(payload)
        avisoExito('Cancha creada')
      }
      limpiarFormulario()
      cargar(lugar.id)
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    } finally {
      setGuardando(false)
    }
  }

  async function archivar() {
    if (!aArchivar || !lugar) return
    try {
      await canchasApi.remove(aArchivar.id)
      avisoExito('Cancha archivada')
      setAArchivar(null)
      cargar(lugar.id)
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
      setAArchivar(null)
    }
  }

  return (
    <Modal isOpen={Boolean(lugar)} onClose={onClose} onSubmit={guardar} title={lugar ? `Canchas de ${lugar.nombre}` : 'Canchas'} size="md">
      <div className="flex flex-col gap-4">
        {error && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{error}</p>}

        <div className="flex flex-col gap-2">
          {cargando ? (
            <p className="text-sm text-rp-muted">Cargando canchas...</p>
          ) : canchas.length === 0 ? (
            <p className="text-sm text-rp-muted">Esta sucursal todavía no tiene canchas.</p>
          ) : (
            canchas.map((cancha) => (
              <div key={cancha.id} className="flex items-center justify-between rounded-md border border-rp-border bg-rp-surface-2/40 px-3 py-2">
                <div>
                  <p className="text-sm font-bold text-rp-text">{cancha.nombre}</p>
                  {cancha.descripcion && <p className="text-xs text-rp-muted">{cancha.descripcion}</p>}
                  {cancha.precioPorHora != null && <p className="text-xs text-rp-muted">{formatearMoneda(cancha.precioPorHora)}/hora</p>}
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => empezarEdicion(cancha)} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent" aria-label="Editar"><Pencil size={15} /></button>
                  <button type="button" onClick={() => setAArchivar(cancha)} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger" aria-label="Archivar"><Trash2 size={15} /></button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="rounded-md border border-rp-border p-3">
          <p className="text-xs font-black uppercase tracking-wide text-rp-accent">{editando ? 'Editar cancha' : 'Nueva cancha'}</p>
          <div className="mt-2 flex flex-col gap-2">
            <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Cancha 1" />
            <Input label="Descripción (opcional)" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Cristal / muro / techada" />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input label="Precio por hora (opcional)" type="number" min={0} value={precioPorHora} onChange={(e) => setPrecioPorHora(e.target.value)} placeholder="8000" />
              <Input label="Seña (%, por defecto 50)" type="number" min={1} max={100} value={seniaPorcentaje} onChange={(e) => setSeniaPorcentaje(e.target.value)} placeholder="50" />
            </div>
            <div className="flex justify-end gap-2">
              {editando && <Button variant="ghost" size="sm" onClick={limpiarFormulario} disabled={guardando}>Cancelar</Button>}
              <Button type="submit" size="sm" disabled={guardando}>
                {editando ? <><Pencil size={15} />Guardar</> : <><Plus size={15} />Agregar</>}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(aArchivar)}
        onClose={() => setAArchivar(null)}
        onConfirm={archivar}
        title="Archivar cancha"
        description={`¿Archivás la cancha "${aArchivar?.nombre}"? Dejará de estar disponible para turnos.`}
      />
    </Modal>
  )
}
