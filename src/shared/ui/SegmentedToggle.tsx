import { cn } from '@/shared/lib/utils'

type OpcionSegmento<T extends string> = { valor: T; label: string }

type SegmentedToggleProps<T extends string> = {
  opciones: OpcionSegmento<T>[]
  valor: T
  onChange: (valor: T) => void
  className?: string
}

export function SegmentedToggle<T extends string>({ opciones, valor, onChange, className }: SegmentedToggleProps<T>) {
  return (
    <div className={cn('flex flex-wrap gap-1 rounded-lg border border-rp-border bg-rp-surface/82 p-1', className)}>
      {opciones.map((opcion) => (
        <button
          key={opcion.valor}
          type="button"
          onClick={() => onChange(opcion.valor)}
          className={cn(
            'grow basis-20 rounded-md px-3 py-2 text-sm font-bold transition',
            valor === opcion.valor ? 'bg-rp-surface-2 text-rp-accent' : 'text-rp-muted hover:text-rp-text',
          )}
        >
          {opcion.label}
        </button>
      ))}
    </div>
  )
}
