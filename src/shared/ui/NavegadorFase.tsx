import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Recorre una lista de a uno con flechas, mostrando el nombre del actual y su posición.
 *
 * Se usa para las fases de un torneo y para las canchas de la agenda. Con `nombreRecurso`
 * las flechas dicen qué se mueve ("Cancha anterior") en vez de un "Anterior" suelto, que
 * es lo único que escucha quien usa lector de pantalla. Y con el foco puesto en el
 * navegador, las flechas del teclado funcionan: es una lista, y así se recorre una lista.
 */
export function NavegadorFase({ etiqueta, indice, total, onAnterior, onSiguiente, nombreRecurso, etiquetaSecundaria }: {
    etiqueta: string
    indice: number
    total: number
    onAnterior: () => void
    onSiguiente: () => void
    nombreRecurso?: string
    etiquetaSecundaria?: string | null
}) {
    if (total <= 0) return null
    const hayVarias = total > 1
    const anterior = nombreRecurso ? `${nombreRecurso} anterior` : 'Anterior'
    const siguiente = nombreRecurso ? `${nombreRecurso} siguiente` : 'Siguiente'

    return (
        <div
            className="flex items-center justify-between gap-3 rounded-lg border border-rp-border bg-rp-surface/82 px-3 py-2"
            onKeyDown={(e) => {
                if (!hayVarias) return
                if (e.key === 'ArrowLeft') { e.preventDefault(); onAnterior() }
                if (e.key === 'ArrowRight') { e.preventDefault(); onSiguiente() }
            }}
        >
            <button
                type="button"
                onClick={onAnterior}
                disabled={!hayVarias}
                aria-label={anterior}
                title={anterior}
                className="flex size-11 shrink-0 items-center justify-center rounded-md text-rp-muted transition hover:bg-rp-surface-2 hover:text-rp-accent disabled:cursor-default disabled:opacity-30 lg:size-8"
            >
                <ChevronLeft size={18} />
            </button>
            <div className="min-w-0 text-center" aria-live="polite">
                <p className="truncate text-sm font-black text-rp-text">{etiqueta}</p>
                {etiquetaSecundaria
                    ? <p className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-rp-muted">{etiquetaSecundaria}</p>
                    : hayVarias && <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-rp-muted">{indice + 1} / {total}</p>}
            </div>
            <button
                type="button"
                onClick={onSiguiente}
                disabled={!hayVarias}
                aria-label={siguiente}
                title={siguiente}
                className="flex size-11 shrink-0 items-center justify-center rounded-md text-rp-muted transition hover:bg-rp-surface-2 hover:text-rp-accent disabled:cursor-default disabled:opacity-30 lg:size-8"
            >
                <ChevronRight size={18} />
            </button>
        </div>
    )
}
