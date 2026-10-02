import { memo } from 'react'
import type { ChangeEvent, InputHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/utils'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
    label?: string
    error?: string | null
    /**
     * Campo de números, escrito como texto.
     *
     * <p>`type="number"` trae problemas que en el mostrador se notan: la rueda del mouse
     * cambia el valor sin que nadie la toque, el navegador acepta o rechaza la coma decimal
     * según su idioma, y deja escribir "e" y "+" igual. Con esto el celular sigue abriendo
     * el teclado numérico y lo que llega al onChange ya viene limpio.
     */
    soloNumeros?: boolean
    /** Deja escribir el signo menos: hay puntajes que restan. */
    permiteNegativo?: boolean
}

export const Input = memo(function Input({ label, error, className, id, soloNumeros, permiteNegativo, onChange, type, inputMode, ...props }: InputProps) {
    const inputId = id ?? (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

    function limpiarYPropagar(evento: ChangeEvent<HTMLInputElement>) {
        if (!onChange) return
        if (soloNumeros) {
            let limpio = evento.target.value.replace(permiteNegativo ? /[^\d-]/g : /\D/g, '')
            // El menos solo vale adelante: "5-3" no es un número.
            if (permiteNegativo) {
                limpio = limpio.charAt(0) + limpio.slice(1).replace(/-/g, '')
            }
            evento.target.value = limpio
        }
        onChange(evento)
    }

    return (
        <div className="flex min-w-0 flex-col gap-1.5">
            {label && <label htmlFor={inputId} className="text-xs font-black uppercase tracking-[0.14em] text-rp-muted">{label}</label>}
            <input
                id={inputId}
                type={soloNumeros ? 'text' : type}
                inputMode={soloNumeros ? (permiteNegativo ? 'text' : 'numeric') : inputMode}
                onChange={limpiarYPropagar}
                className={cn(
                'h-11 w-full min-w-0 max-w-full rounded-md border bg-rp-surface px-3 text-base text-rp-text outline-none transition sm:text-sm',
                error ? 'border-rp-danger' : 'border-rp-border focus:border-rp-accent',
                className,
                )}
                {...props}
            />
            {error ? <span className="text-xs font-bold text-rp-danger">{error}</span> : null}
        </div>
    )
})
