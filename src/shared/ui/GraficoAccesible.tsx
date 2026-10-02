import type { ReactNode } from 'react'

/**
 * Un gráfico con su alternativa en texto.
 *
 * Los gráficos del panel son `div`s con la altura calculada y el dato en un `title`. Eso
 * deja fuera a dos usos reales: el lector de pantalla no ve nada —son cajas de colores sin
 * texto— y en el celular el `title` no se muestra, así que el número del mes no hay forma
 * de leerlo.
 *
 * Acá el gráfico queda como una imagen con su descripción, y debajo va la misma
 * información en una tabla de verdad, plegada. No es solo accesibilidad: es la tabla que
 * hace falta para imprimir y para exportar, y el que quiere el número exacto lo abre y lo
 * lee en vez de pasar el mouse por encima.
 */
export function GraficoAccesible({ resumen, columnas, filas, children }: {
    /** Qué muestra el gráfico, en una frase. Es lo que anuncia el lector de pantalla. */
    resumen: string
    columnas: string[]
    /** Una fila por punto del gráfico, ya formateada. */
    filas: (string | number)[][]
    children: ReactNode
}) {
    return (
        <>
            <div role="img" aria-label={resumen}>{children}</div>
            {filas.length > 0 && (
                <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-bold text-rp-muted hover:text-rp-accent">
                        Ver los datos
                    </summary>
                    <div className="mt-2 overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-rp-border">
                                    {columnas.map((columna) => (
                                        <th key={columna} scope="col" className="py-1 pr-3 font-bold uppercase tracking-wide text-rp-muted">
                                            {columna}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filas.map((fila, i) => (
                                    <tr key={i} className="border-b border-rp-border/60 last:border-0">
                                        {fila.map((celda, j) => (
                                            <td key={j} className={j === 0 ? 'py-1 pr-3 font-bold text-rp-text' : 'py-1 pr-3 text-rp-muted'}>
                                                {celda}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </details>
            )}
        </>
    )
}
