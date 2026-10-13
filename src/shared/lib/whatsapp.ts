/**
 * Enlaces a WhatsApp para responderle al cliente desde el panel sin tener que
 * copiar el número a mano. El sistema no manda el mensaje: lo abre escrito.
 */

/**
 * Normaliza un teléfono argentino al formato que espera wa.me (54 9 + área + número).
 * Contempla lo que la gente escribe de verdad: 0385..., 385 15 ..., +54 9 385...
 */
export function telefonoWhatsApp(telefono: string | null | undefined): string | null {
  if (!telefono) return null
  let digitos = telefono.replace(/\D/g, '')
  if (!digitos) return null

  if (digitos.startsWith('54')) digitos = digitos.slice(2)
  if (digitos.startsWith('9')) digitos = digitos.slice(1)
  if (digitos.startsWith('0')) digitos = digitos.slice(1)
  // El 15 va después del código de área (385 15 6894061). Solo se saca si el número
  // quedó más largo de lo normal: un 11 5689 4061 legítimo ya mide 10 y no se toca.
  if (digitos.length > 10) {
    digitos = digitos.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2')
  }

  if (digitos.length < 8) return null
  return `549${digitos}`
}

export function enlaceWhatsApp(telefono: string | null | undefined, mensaje?: string): string | null {
  const numero = telefonoWhatsApp(telefono)
  if (!numero) return null
  const texto = mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''
  return `https://wa.me/${numero}${texto}`
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/**
 * Recordatorio del turno. Es la palanca directa contra el no-show: cada ausente es una
 * hora de cancha que el club no vendió y ya no puede revender.
 *
 * <p>El texto pide que avisen si no vienen, que es lo que permite liberar el horario a
 * tiempo. Si quedó saldo, lo dice: llegar sabiendo cuánto se debe evita la discusión en
 * el mostrador.
 */
export function mensajeRecordatorioTurno(datos: {
  club: string
  clienteNombre: string | null
  canchaNombre: string | null
  /** Fecha del turno en ISO (yyyy-mm-dd). */
  fecha: string
  horaInicio: string
  saldoPendiente?: number
}): string {
  const dia = new Date(`${datos.fecha}T12:00:00`)
  const cuando = `${DIAS[dia.getDay()]} ${dia.getDate()}/${dia.getMonth() + 1}`
  const hora = datos.horaInicio.slice(0, 5)
  const nombre = datos.clienteNombre?.trim().split(' ')[0]

  const partes = [
    `${nombre ? `Hola ${nombre}!` : 'Hola!'} Te recordamos tu turno en ${datos.club}.`,
    `${cuando} a las ${hora}${datos.canchaNombre ? ` · ${datos.canchaNombre}` : ''}.`,
  ]
  if (datos.saldoPendiente && datos.saldoPendiente > 0) {
    partes.push(`Queda un saldo de $${datos.saldoPendiente.toLocaleString('es-AR')} para abonar en el club.`)
  }
  partes.push('Si no podés venir, avisanos así liberamos la cancha. ¡Gracias!')
  return partes.join('\n')
}

/**
 * Recordatorio de la inscripción que falta pagar. Va a cada jugador por separado: el que
 * ya pagó su parte no tiene por qué recibirlo.
 */
export function mensajeDeudaInscripcion(datos: {
  organizacion: string
  jugadorNombre: string
  torneoNombre: string
  saldo: number
  /** Si ya pagó algo, se lo reconoce: evita el "pero si yo ya pagué". */
  pagado: number
}): string {
  const nombre = datos.jugadorNombre.trim().split(' ')[0]
  const pesos = (monto: number) => `$${monto.toLocaleString('es-AR')}`
  const partes = [`Hola ${nombre}! Te escribimos de ${datos.organizacion} por la inscripción al ${datos.torneoNombre}.`]
  partes.push(datos.pagado > 0
    ? `Tenemos registrado un pago de ${pesos(datos.pagado)}; te queda un saldo de ${pesos(datos.saldo)}.`
    : `Te queda pendiente el pago de ${pesos(datos.saldo)}.`)
  partes.push('Cuando lo abones, mandanos el comprobante por acá. ¡Gracias!')
  return partes.join('\n')
}

export type PartidoDelAviso = {
  hora: string
  categoria: string | null
  etapa: string
  rival: string
  lugar: string | null
  direccion: string | null
  cancha: string | null
}

/**
 * Los horarios de un jugador en un día del torneo, todos en un mensaje: si juega tres
 * partidos (o en dos categorías) recibe uno solo y no tres. Dice el club con la
 * dirección, porque en un torneo de varios clubes es lo primero que se pregunta.
 */
export function mensajeHorariosDelDia(datos: {
  organizacion: string
  torneoNombre: string
  jugadorNombre: string
  diaEtiqueta: string
  partidos: PartidoDelAviso[]
  enlace: string
}): string {
  const nombre = datos.jugadorNombre.trim().split(' ')[0]
  const lineas = datos.partidos.map((p) => {
    const donde = [p.lugar, p.cancha].filter(Boolean).join(', ')
    return `• ${p.hora} hs — ${p.categoria ? `${p.categoria}, ` : ''}${p.etapa} vs ${p.rival}${donde ? `\n   ${donde}${p.direccion ? ` (${p.direccion})` : ''}` : ''}`
  })
  return [
    `Hola ${nombre}! Te escribimos de ${datos.organizacion} por el ${datos.torneoNombre}.`,
    `${datos.partidos.length === 1 ? 'Tu partido' : 'Tus partidos'} del ${datos.diaEtiqueta}:`,
    ...lineas,
    'Te pedimos llegar 15 minutos antes. Si hay algún problema con el horario, avisanos por acá.',
    `Todos los horarios: ${datos.enlace}`,
  ].join('\n')
}

/**
 * Huella corta de un texto, para saber si el aviso que se mandó sigue siendo el que
 * corresponde. No es criptográfica: solo distingue mensajes.
 */
export function huella(texto: string): string {
  let h1 = 0x811c9dc5
  let h2 = 5381
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193)
    h2 = (Math.imul(h2, 33) + c) | 0
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`
}
