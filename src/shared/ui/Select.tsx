import { memo } from 'react'
import type { ReactNode, SelectHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/utils'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
    label?: string
    error?: string | null
    children: ReactNode
    placeholder?: string
}

export const Select = memo(function Select({ label, error, children, placeholder, className, id, ...props }: SelectProps) {
    const selectId = id ?? (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)
    return (
        <div className="flex flex-col gap-1.5">
            {label && <label htmlFor={selectId} className="text-xs font-black uppercase tracking-[0.14em] text-rp-muted">{label}</label>}
            <select
                id={selectId}
                className={cn(
                'h-11 w-full rounded-md border bg-rp-bg px-3 text-sm text-rp-text outline-none transition',
                error ? 'border-rp-danger' : 'border-rp-border focus:border-rp-accent',
                className,
                )}
                {...props}
            >
                {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
                {children}
            </select>
            {error ? <span className="text-xs font-bold text-rp-danger">{error}</span> : null}
        </div>
    )
})