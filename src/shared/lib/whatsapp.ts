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
