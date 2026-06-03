import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'

export function GrupoPartidosColapsable({ title, count, children }: { title: string; count: number; children: ReactNode }) {
    const [abierto, setAbierto] = useState(false)
    return (
        <div>
            <button type="button" onClick={() => setAbierto((v) => !v)} className="mb-1 flex w-full items-center gap-2 text-xs font-bold text-rp-accent/80 hover:text-rp-accent">
                <ChevronDown size={13} className={`transition-transform ${abierto ? '' : '-rotate-90'}`} />
                {title}
                <span className="font-normal text-rp-muted">({count})</span>
            </button>
            {abierto && <div className="grid gap-2">{children}</div>}
        </div>
    )
}
