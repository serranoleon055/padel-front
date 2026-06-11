import { memo } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/utils'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
    label?: string
    error?: string | null
}

export const Input = memo(function Input({ label, error, className, id, ...props }: InputProps) {
    const inputId = id ?? (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)
    return (
        <div className="flex flex-col gap-1.5">
            {label && <label htmlFor={inputId} className="text-xs font-black uppercase tracking-[0.14em] text-rp-muted">{label}</label>}
            <input
                id={inputId}
                className={cn(
                'h-11 w-full rounded-md border bg-rp-surface px-3 text-sm text-rp-text outline-none transition',
                error ? 'border-rp-danger' : 'border-rp-border focus:border-rp-accent',
                className,
                )}
                {...props}
            />
            {error ? <span className="text-xs font-bold text-rp-danger">{error}</span> : null}
        </div>
    )
})