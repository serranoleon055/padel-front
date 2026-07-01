import { ChevronLeft, ChevronRight } from 'lucide-react'

export function NavegadorFase({ etiqueta, indice, total, onAnterior, onSiguiente }: {
    etiqueta: string
    indice: number
    total: number
    onAnterior: () => void
    onSiguiente: () => void
}) {
    if (total <= 0) return null
    const hayVarias = total > 1

    return (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-rp-border bg-rp-surface/82 px-3 py-2">
            <button
                type="button"
                onClick={onAnterior}
                disabled={!hayVarias}
                aria-label="Anterior"
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-rp-muted transition hover:bg-rp-surface-2 hover:text-rp-accent disabled:cursor-default disabled:opacity-30"
            >
                <ChevronLeft size={18} />
            </button>
            <div className="min-w-0 text-center">
                <p className="truncate text-sm font-black text-rp-text">{etiqueta}</p>
                {hayVarias && <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-rp-muted">{indice + 1} / {total}</p>}
            </div>
            <button
                type="button"
                onClick={onSiguiente}
                disabled={!hayVarias}
                aria-label="Siguiente"
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-rp-muted transition hover:bg-rp-surface-2 hover:text-rp-accent disabled:cursor-default disabled:opacity-30"
            >
                <ChevronRight size={18} />
            </button>
        </div>
    )
}
