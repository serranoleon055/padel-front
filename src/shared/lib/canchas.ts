/**
 * Orden de las canchas: por número, no por texto.
 *
 * Ordenar "Cancha 10" y "Cancha 2" como strings pone la 10 antes que la 2. El club las
 * nombra por número y las mira en ese orden, así que se compara el primer número que
 * aparezca en el nombre y recién si empatan (o no hay número) se cae al orden alfabético.
 */
const numeroDe = (nombre: string) => {
  const encontrado = nombre.match(/\d+/)
  return encontrado ? Number(encontrado[0]) : Number.POSITIVE_INFINITY
}

export function compararCanchas(a: string, b: string) {
  const numeroA = numeroDe(a)
  const numeroB = numeroDe(b)
  if (numeroA !== numeroB) return numeroA - numeroB
  return a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' })
}

/** El mismo orden, para objetos que traen el nombre adentro. */
export function porNombreDeCancha<T>(nombre: (item: T) => string) {
  return (a: T, b: T) => compararCanchas(nombre(a), nombre(b))
}
