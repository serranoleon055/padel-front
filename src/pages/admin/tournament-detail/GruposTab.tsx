import { ChevronDown } from 'lucide-react'

import type { GrupoResponse } from '@/shared/types/api'
import { StatusMessage } from '@/shared/ui/StatusMessage'

export function GruposTab({ grupos, expandidos, onToggle }: {
    grupos: GrupoResponse[]
    expandidos: Set<number>
    onToggle: (grupoId: number) => void
}) {
    if (grupos.length === 0) {
        return <StatusMessage type="empty" title="No hay grupos" description="Los grupos se crean al generar el sorteo." />
    }

    return (
        <div className="space-y-4">
        {Object.entries(
            grupos.reduce((acum: Record<string, GrupoResponse[]>, grupo) => {
            const clave = grupo.categoriaNombre
            if (!acum[clave]) acum[clave] = []
            acum[clave].push(grupo)
            return acum
            }, {})
        ).map(([nombreCat, gruposCat]) => (
            <div key={nombreCat}>
            <h3 className="mb-3 text-sm font-black uppercase tracking-[0.12em] text-rp-accent">{nombreCat}</h3>
            <div className="grid gap-3">
                {gruposCat.map((grupo) => (
                <div key={grupo.id} className="rounded-lg border border-rp-border bg-rp-surface/82">
                    <button onClick={() => onToggle(grupo.id)} className="flex w-full items-center justify-between p-4">
                    <span className="font-bold text-rp-text">{grupo.nombre}</span>
                    <ChevronDown size={16} className={`text-rp-muted transition-transform ${expandidos.has(grupo.id) ? 'rotate-180' : ''}`} />
                    </button>
                    {expandidos.has(grupo.id) && (
                    <div className="overflow-x-auto border-t border-rp-border px-4 py-3">
                        <table className="w-full min-w-[28rem] text-xs">
                        <thead>
                            <tr className="text-left text-rp-muted">
                            <th className="pb-2 pr-2 font-bold">#</th>
                            <th className="pb-2 pr-2 font-bold">Pareja</th>
                            <th className="pb-2 pr-2 font-bold text-center">PJ</th>
                            <th className="pb-2 pr-2 font-bold text-center">PG</th>
                            <th className="pb-2 pr-2 font-bold text-center">PP</th>
                            <th className="pb-2 pr-2 font-bold text-center">Sets</th>
                            <th className="pb-2 pr-2 font-bold text-center">Juegos</th>
                            <th className="pb-2 font-bold text-center">Pts</th>
                            </tr>
                        </thead>
                        <tbody>
                            {grupo.posiciones.map((pos) => (
                            <tr key={pos.id} className="border-t border-rp-border/50">
                                <td className="py-2 pr-2 font-bold text-rp-muted">{pos.posicion}</td>
                                <td className="py-2 pr-2 text-rp-text">{pos.parejaNombre}</td>
                                <td className="py-2 pr-2 text-center text-rp-muted">{pos.pj}</td>
                                <td className="py-2 pr-2 text-center text-rp-muted">{pos.pg}</td>
                                <td className="py-2 pr-2 text-center text-rp-muted">{pos.pp}</td>
                                <td className="py-2 pr-2 text-center text-rp-muted">{pos.setsGanados}-{pos.setsPerdidos}</td>
                                <td className="py-2 pr-2 text-center text-rp-muted">{pos.juegosGanados}-{pos.juegosPerdidos}</td>
                                <td className="py-2 text-center font-bold text-rp-accent">{pos.puntos}</td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                    )}
                </div>
                ))}
            </div>
            </div>
        ))}
        </div>
    )
}
