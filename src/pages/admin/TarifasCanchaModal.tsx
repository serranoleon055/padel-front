import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { describirDias, tarifasApi, type TarifaCanchaResponse } from '@/features/catalog/tarifasApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { formatearMoneda } from '@/shared/lib/formatters'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { useToast } from '@/shared/ui/Toast'

const DIAS = [
  { valor: 1, nombre: 'Lun' },
  { valor: 2, nombre: 'Mar' },
  { valor: 3, nombre: 'Mié' },
  { valor: 4, nombre: 'Jue' },
  { valor: 5, nombre: 'Vie' },
  { valor: 6, nombre: 'Sáb' },
  { valor: 7, nombre: 'Dom' },
]

const VACIO = { nombre: '', dias: [] as number[], horaDesde: '18:00', horaHasta: '23:00', precio: '' }

function aNumero(valor: string): number | null {
  const limpio = valor.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  if (!limpio) return null
  const numero = Number(limpio)
  return Number.isFinite(numero) ? numero : null
}

type Props = {
  canchaId: number | null
  canchaNombre: string
  precioBase: number | null
  onClose: () => void
}

export function TarifasCanchaModal({ canchaId, canchaNombre, precioBase, onClose }: Props) {
  const { success: avisoExito } = useToast()
  const [tarifas, setTarifas] = useState<TarifaCanchaResponse[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formulario, setFormulario] = useState({ ...VACIO })
  const [editando, setEditando] = useState<TarifaCanchaResponse | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [aBorrar, setABorrar] = useState<TarifaCanchaResponse | null>(null)

  function cargar(id: number) {
    setCargando(true)
    tarifasApi.getAll(id)
      .then((datos) => { setTarifas(datos); setError(null) })
      .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    if (canchaId == null) return
    setFormulario({ ...VACIO })
    setEditando(null)
    setError(null)
    cargar(canchaId)
  }, [canchaId])

  function alternarDia(dia: number) {
    setFormulario((f) => ({
      ...f,
      dias: f.dias.includes(dia) ? f.dias.filter((d) => d !== dia) : [...f.dias, dia].sort(),
    }))
  }

  function empezarEdicion(tarifa: TarifaCanchaResponse) {
    setEditando(tarifa)
    setFormulario({
      nombre: tarifa.nombre,
      dias: tarifa.diasSemana.split(',').map(Number).sort(),
      horaDesde: tarifa.horaDesde.slice(0, 5),
      horaHasta: tarifa.horaHasta.slice(0, 5),
      precio: String(tarifa.precioPorHora),
    })
  }

  async function guardar() {
    if (canchaId == null) return
    if (!formulario.nombre.trim()) { setError('Poné un nombre a la franja.'); return }
    if (formulario.dias.length === 0) { setError('Elegí al menos un día.'); return }
    const precio = aNumero(formulario.precio)
    if (precio == null || precio <= 0) { setError('Ingresá un precio válido.'); return }

    const cuerpo = {
      canchaId,
      nombre: formulario.nombre.trim(),
      diasSemana: formulario.dias.join(','),
      horaDesde: `${formulario.horaDesde}:00`,
      horaHasta: `${formulario.horaHasta}:00`,
      precioPorHora: precio,
    }

    setGuardando(true); setError(null)
    try {
      if (editando) await tarifasApi.update(editando.id, cuerpo)
      else await tarifasApi.create(cuerpo)
      setFormulario({ ...VACIO })
      setEditando(null)
      cargar(canchaId)
      avisoExito(editando ? 'Franja actualizada' : 'Franja creada')
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    } finally { setGuardando(false) }
  }

  async function borrar() {
    if (!aBorrar || canchaId == null) return
    try {
      await tarifasApi.remove(aBorrar.id)
      setABorrar(null)
      cargar(canchaId)
      avisoExito('Franja eliminada')
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e)); setABorrar(null)
    }
  }

  return (
    <>
      <Modal isOpen={canchaId != null} onClose={onClose} onSubmit={guardar} title={`Tarifas · ${canchaNombre}`} size="md">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-rp-muted">
            Cobrá distinto según el día y la hora. Los horarios que ninguna franja cubra se
            cobran a la tarifa base de la cancha
            {precioBase != null ? ` (${formatearMoneda(precioBase)}/hora)` : ''}.
          </p>

          {cargando ? (
            <p className="text-sm text-rp-muted">Cargando...</p>
          ) : tarifas.length === 0 ? (
            <p className="rounded-md border border-rp-border bg-rp-surface-2 px-3 py-2 text-sm text-rp-muted">
              Sin franjas: todo se cobra a la tarifa base.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {tarifas.map((tarifa) => (
                <div key={tarifa.id} className="flex items-center justify-between gap-2 rounded-md border border-rp-border px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-rp-text">{tarifa.nombre}</p>
                    <p className="text-xs text-rp-muted">
                      {describirDias(tarifa.diasSemana)} · {tarifa.horaDesde.slice(0, 5)} a {tarifa.horaHasta.slice(0, 5)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-sm font-bold text-rp-accent">{formatearMoneda(tarifa.precioPorHora)}</span>
                    <button type="button" onClick={() => empezarEdicion(tarifa)} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent" aria-label="Editar"><Pencil size={14} /></button>
                    <button type="button" onClick={() => setABorrar(tarifa)} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger" aria-label="Eliminar"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-md border border-rp-border bg-rp-surface-2 p-3">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-rp-muted">
              {editando ? 'Editar franja' : 'Nueva franja'}
            </p>
            <div className="flex flex-col gap-3">
              <Input label="Nombre" value={formulario.nombre} onChange={(e) => setFormulario((f) => ({ ...f, nombre: e.target.value }))} placeholder="Nocturno, Fin de semana..." />

              <div>
                <p className="mb-1.5 text-xs font-bold text-rp-muted">Días</p>
                <div className="flex flex-wrap gap-1.5">
                  {DIAS.map((dia) => (
                    <button
                      key={dia.valor}
                      type="button"
                      onClick={() => alternarDia(dia.valor)}
                      className={`min-h-11 min-w-11 rounded-md border px-3 text-xs font-bold transition ${
                        formulario.dias.includes(dia.valor)
                          ? 'border-rp-accent bg-rp-accent/15 text-rp-accent'
                          : 'border-rp-border text-rp-muted hover:text-rp-text'
                      }`}
                    >
                      {dia.nombre}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input label="Desde" type="time" value={formulario.horaDesde} onChange={(e) => setFormulario((f) => ({ ...f, horaDesde: e.target.value }))} />
                <Input label="Hasta" type="time" value={formulario.horaHasta} onChange={(e) => setFormulario((f) => ({ ...f, horaHasta: e.target.value }))} />
              </div>
              <p className="text-[11px] text-rp-muted">Si el cierre es menor que el inicio, la franja cruza la medianoche (ej: 20:00 a 02:00).</p>

              <Input label="Precio por hora" value={formulario.precio} onChange={(e) => setFormulario((f) => ({ ...f, precio: e.target.value }))} placeholder="26000" />

              <div className="flex justify-end gap-2">
                {editando && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setEditando(null); setFormulario({ ...VACIO }) }}>Cancelar edición</Button>
                )}
                <Button type="submit" size="sm" disabled={guardando}>
                  <Plus size={15} />{guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Agregar franja'}
                </Button>
              </div>
            </div>
          </div>

          {error && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{error}</p>}

          <div className="flex justify-end">
            <Button type="button" variant="subtle" size="sm" onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(aBorrar)}
        onClose={() => setABorrar(null)}
        onConfirm={borrar}
        title="Eliminar franja"
        description={`Los turnos de "${aBorrar?.nombre ?? ''}" pasan a cobrarse a la tarifa base. Los turnos ya reservados conservan su precio.`}
      />
    </>
  )
}
