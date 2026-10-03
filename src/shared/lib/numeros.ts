/**
 * Los montos se escriben como texto y se limpian al enviar.
 *
 * <p>Acepta lo que una persona escribe de verdad en el mostrador: "$ 18.000", "18000",
 * "1.250,50". El punto es separador de miles y la coma es la decimal, que es como se
 * escribe acá. Devuelve null si no quedó un número.
 */
export function aNumero(valor: string): number | null {
  const limpio = valor.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  if (!limpio) return null
  const numero = Number(limpio)
  return Number.isFinite(numero) ? numero : null
}
