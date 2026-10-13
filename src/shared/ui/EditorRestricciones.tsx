import { Plus, X } from 'lucide-react'

import { conDia, opcionesDeDia, valorDia } from '@/shared/lib/restricciones'
import type { RestriccionHoraria } from '@/shared/types/api'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { Select } from '@/shared/ui/Select'

/**
 * Los horarios en que una pareja NO puede jugar. Lo usan la inscripción pública y el
 * panel, así que se ve igual en los dos lados.
 */
export function EditorRestricciones({ valor, onChange, fechaInicio, fechaFin }: {
  valor: RestriccionHoraria[]
  onChange: (restricciones: RestriccionHoraria[]) => void
  fechaInicio?: string | null
  fechaFin?: string | null
}) {
  const opciones = opcionesDeDia(fechaInicio, fechaFin)

  function actualizar(indice: number, cambios: RestriccionHoraria) {
    onChange(valor.map((r, i) => (i === indice ? cambios : r)))
  }

  function agregar() {
    const ultima = valor[valor.length - 1]
    const base: RestriccionHoraria = ultima ? { ...ultima } : { horaDesde: '09:00', horaHasta: '14:00' }
    onChange([...valor, ultima ? base : conDia(base, opciones[0].valor)])
  }

  return (
    <div className="flex flex-col gap-2">
      {valor.map((restriccion, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 sm:grid-cols-[1.5fr_1fr_1fr_auto]">
          <div className="col-span-3 sm:col-span-1">
            <Select id={`restriccion-dia-${i}`} label="Día" value={valorDia(restriccion)} onChange={(e) => actualizar(i, conDia(restriccion, e.target.value))}>
              {opciones.map((o) => <option key={o.valor} value={o.valor}>{o.label}</option>)}
              {/* Una restricción cargada antes de que cambiaran las fechas del torneo no se pierde. */}
              {!opciones.some((o) => o.valor === valorDia(restriccion)) && <option value={valorDia(restriccion)}>{etiquetaFueraDeRango(restriccion)}</option>}
            </Select>
          </div>
          <Input id={`restriccion-desde-${i}`} label="Desde" type="time" value={restriccion.horaDesde.slice(0, 5)} onChange={(e) => actualizar(i, { ...restriccion, horaDesde: e.target.value })} />
          <Input id={`restriccion-hasta-${i}`} label="Hasta" type="time" value={restriccion.horaHasta.slice(0, 5)} onChange={(e) => actualizar(i, { ...restriccion, horaHasta: e.target.value })} />
          <button type="button" onClick={() => onChange(valor.filter((_, j) => j !== i))} className="mb-0.5 flex size-11 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger" aria-label="Quitar horario"><X size={16} /></button>
        </div>
      ))}
      <div>
        <Button type="button" size="sm" variant="ghost" onClick={agregar}><Plus size={14} />{valor.length === 0 ? 'Agregar un horario en que no pueden' : 'Agregar otro'}</Button>
      </div>
    </div>
  )
}

/** Para lo que ya no está entre las opciones: un día de la semana en un torneo corto, o una fecha que quedó fuera del torneo. */
function etiquetaFueraDeRango(restriccion: RestriccionHoraria): string {
  if (restriccion.fecha) return restriccion.fecha.split('-').reverse().join('/')
  return opcionesDeDia(null, null).find((o) => o.valor === valorDia(restriccion))?.label ?? 'Otro día'
}
