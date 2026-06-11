import { memo } from 'react'
import type { ReactNode } from 'react'

type AdminPageHeaderProps = {
    title: ReactNode
    action?: ReactNode
    eyebrow?: string
}

export const AdminPageHeader = memo(function AdminPageHeader({ title, action, eyebrow = 'Admin' }: AdminPageHeaderProps) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-rp-accent">{eyebrow}</p>
                <h1 className="mt-2 flex items-center gap-2 text-2xl font-black text-rp-text sm:text-3xl">{title}</h1>
            </div>
            {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
        </div>
    )
})
