/**
 * Exportar a CSV para que Excel en español lo abra bien de una, sin el asistente de
 * importación. Tres cosas lo hacen posible y las tres importan:
 *
 * - **BOM al principio**: sin él, Excel en Windows lee el archivo como ANSI y los acentos
 *   y la eñe salen rotos.
 * - **Punto y coma como separador**: en la configuración regional española la coma es el
 *   separador decimal, así que un CSV con comas mete cada número en dos celdas.
 * - **Coma decimal en los números**: si se exporta "1234.50", Excel es-AR lo lee como
 *   texto y no se puede sumar la columna.
 */

const BOM = '﻿'

/** Número con coma decimal y sin separador de miles (el de miles rompe la celda). */
export function numeroCsv(valor: number | null | undefined) {
  if (valor == null || !Number.isFinite(valor)) return ''
  return valor.toFixed(2).replace('.', ',')
}

/**
 * Escapa una celda: si trae el separador, comillas o un salto de línea, va entre comillas
 * dobles y las comillas de adentro se duplican (que es como manda el formato).
 */
function celda(valor: string | number | null | undefined) {
  if (valor == null) return ''
  const texto = String(valor)
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

/** Dispara la descarga de un CSV ya armado. */
export function descargarCsv(nombreArchivo: string, filas: (string | number | null | undefined)[][]) {
  const contenido = BOM + filas.map((fila) => fila.map(celda).join(';')).join('\r\n')
  const enlace = document.createElement('a')
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8;' }))
  enlace.href = url
  enlace.download = nombreArchivo.endsWith('.csv') ? nombreArchivo : `${nombreArchivo}.csv`
  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)
  // Sin esto el blob queda retenido en memoria hasta que se recargue la página.
  URL.revokeObjectURL(url)
}
