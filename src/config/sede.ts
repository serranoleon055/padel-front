import { brand } from '@/config/brand'
import { imagenes } from '@/config/imagenes'
import type { ConfiguracionSede } from '@/shared/types/api'

/**
 * Galería de relleno, hasta que el club suba sus fotos desde el panel.
 *
 * Un club puede apuntar varias de sus imágenes de marca al mismo archivo —es lo que pasa
 * cuando todavía no tiene fotos y usa una ilustración—, y ahí la galería mostraba cuatro
 * veces lo mismo, que se lee como un error de la página. Con una sola alcanza.
 */
function sinRepetidas(fotos: { url: string, alt: string }[]) {
  const vistas = new Set<string>()
  return fotos.filter((foto) => {
    if (vistas.has(foto.url)) return false
    vistas.add(foto.url)
    return true
  })
}

export const configuracionSedeDefault: ConfiguracionSede = {
  email: brand.email,
  telefono: brand.phone,
  whatsapp: '5493856894061',
  instagram: 'https://instagram.com/',
  facebook: 'https://facebook.com/',
  direccion: `${brand.location}, ${brand.country}`,
  mapsEmbedUrl: `https://www.google.com/maps?q=${encodeURIComponent(`${brand.location}, ${brand.country}`)}&output=embed`,
  cancelacionHorasMinimas: 12,
  fondoFijo: null,
  horarios: [
    { dias: 'Lunes a Viernes', horas: '08:00 - 00:00' },
    { dias: 'Sábados', horas: '09:00 - 01:00' },
    { dias: 'Domingos y feriados', horas: '09:00 - 23:00' },
  ],
  galeria: sinRepetidas([
    { url: imagenes.cancha, alt: 'Cancha de pádel' },
    { url: imagenes.portada, alt: 'El club' },
    { url: imagenes.torneo, alt: 'Torneos del club' },
    { url: imagenes.ambiente, alt: 'Vista del complejo' },
  ]),
  formasPago: ['Efectivo', 'Transferencia', 'Mercado Pago (seña online)'],
}

export const whatsappUrl = (numero: string | null, mensaje?: string) => {
  const limpio = (numero ?? '').replace(/\D/g, '')
  return `https://wa.me/${limpio}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`
}

export function normalizarMapsEmbed(valor: string | null | undefined): string | null {
  const texto = (valor ?? '').trim()
  if (!texto) return null
  if (texto.includes('output=embed') || texto.includes('/maps/embed')) return texto
  const esUrlMaps = /^https?:\/\//i.test(texto) && /google\.[^/]+\/maps|maps\.google\./i.test(texto)
  if (esUrlMaps) {
    return `${texto}${texto.includes('?') ? '&' : '?'}output=embed`
  }
  return `https://www.google.com/maps?q=${encodeURIComponent(texto)}&output=embed`
}
