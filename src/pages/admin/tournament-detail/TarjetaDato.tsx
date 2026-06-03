import { memo } from 'react'

export const TarjetaDato = memo(function TarjetaDato({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border border-rp-border bg-rp-surface/82 p-5 text-center">
            <strong className="block text-2xl font-black text-rp-accent">{value}</strong>
            <span className="mt-2 block text-xs font-bold text-rp-muted">{label}</span>
        </div>
    )
})
