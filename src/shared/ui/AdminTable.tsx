import { memo } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'
import { StatusMessage } from '@/shared/ui/StatusMessage'

export type Column<T> = {
    key: string
    label: string
    render: (item: T) => ReactNode
    className?: string
}

type AdminTableProps<T> = {
    columns: Column<T>[]
    rows: T[]
    getRowKey: (item: T) => string | number
    isLoading?: boolean
    error?: string | null
    emptyTitle?: string
    emptyDescription?: string
    actions?: (item: T) => ReactNode
    selectedIds?: Set<number>
    onToggleSelect?: (id: number) => void
    onSelectAll?: () => void
}

function AdminTableInner<T extends { id: number }>({ columns, rows, getRowKey, isLoading = false, error = null, emptyTitle = 'No hay registros', emptyDescription, actions, selectedIds, onToggleSelect, onSelectAll }: AdminTableProps<T>) {
    const showCheckbox = selectedIds !== undefined && onToggleSelect !== undefined
    const colTemplate = `${showCheckbox ? '40px ' : ''}${columns.map(() => '1fr').join(' ')}${actions ? ' 100px' : ''}`

    return (
        <div className="overflow-hidden rounded-lg border border-rp-border bg-rp-surface/82">
            <div className="hidden border-b border-rp-border bg-rp-surface px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-rp-muted md:grid md:items-center" style={{ gridTemplateColumns: colTemplate }}>
                {showCheckbox && (
                    <input type="checkbox" checked={selectedIds.size === rows.length && rows.length > 0} onChange={onSelectAll} className="size-4 accent-rp-accent" />
                )}
                {columns.map((col) => <span key={col.key} className={col.className}>{col.label}</span>)}
                {actions ? <span className="text-right">Acciones</span> : null}
            </div>
            <div className="divide-y divide-rp-border max-md:flex max-md:flex-col max-md:gap-2.5 max-md:divide-y-0 max-md:p-2.5">
                {isLoading ? (
                    <div className="p-4"><StatusMessage type="loading" title="Cargando datos..." /></div>
                ) : error ? (
                    <div className="p-4"><StatusMessage type="error" title="Error al cargar" description={error} /></div>
                ) : rows.length === 0 ? (
                    <div className="p-4"><StatusMessage type="empty" title={emptyTitle} description={emptyDescription} /></div>
                ) : (
                    rows.map((item) => (
                    <div key={getRowKey(item)} className="flex flex-col gap-2.5 px-4 py-3.5 max-md:rounded-lg max-md:border max-md:border-rp-border max-md:bg-rp-bg/40 md:grid md:items-center md:gap-3 md:py-3" style={{ gridTemplateColumns: colTemplate }}>
                        {showCheckbox && (
                            <label className="flex items-center gap-2 text-xs font-bold text-rp-muted md:contents">
                                <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => onToggleSelect(item.id)} className="size-4 accent-rp-accent" />
                                <span className="md:hidden">Seleccionar</span>
                            </label>
                        )}
                        {columns.map((col) => (
                            <div key={col.key} className={cn('flex items-start justify-between gap-4 md:block', col.className)}>
                                <span className="shrink-0 text-[11px] font-black uppercase tracking-[0.08em] text-rp-muted md:hidden">{col.label}</span>
                                <div className="min-w-0 text-right md:text-left">{col.render(item)}</div>
                            </div>
                        ))}
                        {actions ? <div className="flex flex-wrap justify-end gap-1 border-t border-rp-border pt-2.5 md:border-0 md:pt-0">{actions(item)}</div> : null}
                    </div>
                    ))
                )}
            </div>
        </div>
    )
}

export const AdminTable = memo(AdminTableInner) as typeof AdminTableInner
