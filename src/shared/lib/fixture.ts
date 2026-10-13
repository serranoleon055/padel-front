const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/** "2026-11-14T09:30:00" → "2026-11-14". Las fechas del backend vienen sin zona: se leen como texto. */
export const diaDe = (momento: string) => momento.slice(0, 10)

/** "2026-11-14T09:30:00" → "09:30". */
export const horaDe = (momento: string) => momento.slice(11, 16)

/** "2026-11-14" → "Sábado 14/11". */
export function etiquetaDia(dia: string): string {
  const fecha = new Date(`${dia}T12:00:00`)
  const nombre = DIAS[fecha.getDay()]
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${fecha.getDate()}/${fecha.getMonth() + 1}`
}

/** Para un input datetime-local: "2026-11-14T09:30". */
export const aInputFechaHora = (momento: string | null | undefined) => (momento ? momento.slice(0, 16) : '')
