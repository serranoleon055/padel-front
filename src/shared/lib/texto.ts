/** Para buscar sin que importen mayúsculas ni tildes: "Ávila" encuentra "avila". */
export function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}
