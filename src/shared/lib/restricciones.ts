import type { RestriccionHoraria } from '@/shared/types/api'

const DIAS = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

export type OpcionDia = { valor: string; label: string }

/**
 * Los días que se ofrecen para decir "no podemos": las fechas del torneo si es corto
 * (minitorneo, fin de semana), o los días de la semana si dura semanas (liga).
 * El valor es "f:2026-11-07" o "d:6".
 */
export function opcionesDeDia(fechaInicio: string | null | undefined, fechaFin: string | null | undefined): OpcionDia[] {
  if (fechaInicio) {
    const inicio = new Date(`${fechaInicio}T12:00:00`)
    const fin = new Date(`${fechaFin ?? fechaInicio}T12:00:00`)
    const dias = Math.round((fin.getTime() - inicio.getTime()) / 86_400_000)
    if (dias >= 0 && dias <= 13) {
      return Array.from({ length: dias + 1 }, (_, i) => {
        const fecha = new Date(inicio)
        fecha.setDate(inicio.getDate() + i)
        const iso = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
        const nombre = DIAS[fecha.getDay() === 0 ? 7 : fecha.getDay()]
        return { valor: `f:${iso}`, label: `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${fecha.getDate()}/${fecha.getMonth() + 1}` }
      })
    }
  }
  return [1, 2, 3, 4, 5, 6, 7].map((d) => ({ valor: `d:${d}`, label: `Los ${DIAS[d]}${d >= 6 ? 's' : ''}` }))
}

export function valorDia(restriccion: RestriccionHoraria): string {
  return restriccion.fecha ? `f:${restriccion.fecha}` : `d:${restriccion.diaSemana ?? 1}`
}

export function conDia(restriccion: RestriccionHoraria, valor: string): RestriccionHoraria {
  return valor.startsWith('f:')
    ? { ...restriccion, fecha: valor.slice(2), diaSemana: null }
    : { ...restriccion, fecha: null, diaSemana: Number(valor.slice(2)) }
}

/** "sáb 7/11 de 09:00 a 14:00" o "los martes de 20:00 a 23:59". */
export function describirRestriccion(restriccion: RestriccionHoraria): string {
  const horas = `de ${restriccion.horaDesde.slice(0, 5)} a ${restriccion.horaHasta.slice(0, 5)}`
  if (restriccion.fecha) {
    const fecha = new Date(`${restriccion.fecha}T12:00:00`)
    return `${DIAS[fecha.getDay() === 0 ? 7 : fecha.getDay()].slice(0, 3)} ${fecha.getDate()}/${fecha.getMonth() + 1} ${horas}`
  }
  const dia = restriccion.diaSemana ?? 1
  return `los ${DIAS[dia]}${dia >= 6 ? 's' : ''} ${horas}`
}
