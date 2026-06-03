import { useState } from 'react'

import type { JugadorResponse } from '@/shared/types/api'

export function BuscadorJugador({ label, onChange, jugadores, value }: {
    label: string
    jugadores: JugadorResponse[]
    value: number
    onChange: (id: number) => void
}) {
    const [consulta, setConsulta] = useState('')
    const [abierto, setAbierto] = useState(false)

    const seleccionado = jugadores.find((jugador) => jugador.id === value)
    const filtrados = jugadores
        .filter((jugador) => !consulta || `${jugador.nombre} ${jugador.apellido}`.toLowerCase().includes(consulta.toLowerCase()))
        .slice(0, 8)

    return (
        <div>
            <label className="mb-1 block text-xs font-bold text-rp-muted">{label}</label>
            {seleccionado && !abierto && (
                <button
                    type="button"
                    className="mb-1 flex w-full items-center justify-between rounded-lg border border-rp-accent/40 bg-rp-accent/10 px-3 py-2 text-sm"
                    onClick={() => { setConsulta(''); setAbierto(true) }}
                >
                    <span>
                        <span className="font-bold text-rp-text">{seleccionado.nombre} {seleccionado.apellido}</span>
                        {seleccionado.categoriaNombre && <span className="ml-2 text-xs text-rp-muted">{seleccionado.categoriaNombre}</span>}
                    </span>
                    <span className="text-xs text-rp-muted">Cambiar</span>
                </button>
            )}
            {(!seleccionado || abierto) && (
                <>
                    <input
                        className="h-10 w-full rounded-lg border border-rp-border bg-rp-surface/82 px-3 text-sm text-rp-text placeholder:text-rp-muted focus:border-rp-accent focus:outline-none"
                        placeholder="Buscar jugador por nombre..."
                        value={consulta}
                        autoFocus={abierto}
                        onChange={(e) => { setConsulta(e.target.value); setAbierto(true) }}
                        onFocus={() => setAbierto(true)}
                        onBlur={() => setTimeout(() => setAbierto(false), 160)}
                    />
                    {/* Dropdown INLINE (no absolute) para no quedar cortado por el modal */}
                    {abierto && (
                        <div className="mt-1 overflow-hidden rounded-lg border border-rp-border bg-rp-surface">
                            {filtrados.length === 0 ? (
                                <p className="px-3 py-2 text-xs text-rp-muted">
                                    {consulta ? `Sin resultados para "${consulta}"` : 'Escribí para buscar...'}
                                </p>
                            ) : (
                                <div className="max-h-36 overflow-y-auto">
                                    {filtrados.map((jugador) => (
                                        <button
                                            key={jugador.id}
                                            type="button"
                                            className={`w-full px-3 py-2 text-left hover:bg-rp-surface-2 ${jugador.id === value ? 'bg-rp-accent/10' : ''}`}
                                            onMouseDown={(e) => { e.preventDefault(); onChange(jugador.id); setConsulta(''); setAbierto(false) }}
                                        >
                                            <div className="text-sm font-bold text-rp-text">{jugador.nombre} {jugador.apellido}</div>
                                            {jugador.categoriaNombre && <div className="text-xs text-rp-muted">{jugador.categoriaNombre}</div>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
