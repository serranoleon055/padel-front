/**
 * Orden de los horarios dentro de la jornada del club, que no es el orden del reloj.
 *
 * Un club que abre a las 10 y cierra a las 2 tiene las 00 y la 1 como sus dos últimos
 * turnos, no como los primeros. Ordenar por el string "01:00" los mandaba arriba de todo,
 * antes del turno de las 10 de la mañana. Espeja `OrdenJornada.java` del backend.
 */

const MINUTOS_DEL_DIA = 24 * 60

/** "HH:mm" o "HH:mm:ss" a minutos desde las 00:00. */
function aMinutos(hora: string) {
  const [horas, minutos] = hora.split(':')
  return Number(horas) * 60 + Number(minutos ?? 0)
}

/**
 * Minutos que pasaron desde la apertura. Lo anterior a la apertura es la madrugada
 * siguiente, así que suma una vuelta de reloj y queda al final.
 */
export function minutosDesdeApertura(hora: string | null | undefined, apertura: string | null | undefined) {
  if (!hora) return MINUTOS_DEL_DIA
  if (!apertura) return aMinutos(hora)
  const minutos = aMinutos(hora) - aMinutos(apertura)
  return minutos < 0 ? minutos + MINUTOS_DEL_DIA : minutos
}

/** Comparador de horarios "HH:mm" para una jornada que arranca en `apertura`. */
export function compararPorJornada(apertura: string | null | undefined) {
  return (a: string, b: string) => minutosDesdeApertura(a, apertura) - minutosDesdeApertura(b, apertura)
}

/**
 * Las horas de una jornada en orden, arrancando por la de apertura. Con apertura 10 y
 * cierre 2 devuelve 10, 11, ... 23, 0, 1.
 */
export function horasDeLaJornada(horaApertura: number, horas: number[]) {
  const presentes = [...new Set(horas)]
  if (presentes.length === 0) return []
  const posicion = (hora: number) => (hora - horaApertura + 24) % 24
  const ultima = Math.max(...presentes.map(posicion))
  return Array.from({ length: ultima + 1 }, (_, i) => (horaApertura + i) % 24)
}
