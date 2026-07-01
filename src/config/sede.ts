import { brand } from '@/config/brand'
import type { ConfiguracionSede } from '@/shared/types/api'

export const configuracionSedeDefault: ConfiguracionSede = {
  email: brand.email,
  telefono: brand.phone,
  whatsapp: '5493856894061',
  instagram: 'https://instagram.com/',
  facebook: 'https://facebook.com/',
  direccion: `${brand.location}, ${brand.country}`,
  mapsEmbedUrl: `https://www.google.com/maps?q=${encodeURIComponent(`${brand.location}, ${brand.country}`)}&output=embed`,
  horarios: [
    { dias: 'Lunes a Viernes', horas: '08:00 - 00:00' },
    { dias: 'Sábados', horas: '09:00 - 01:00' },
    { dias: 'Domingos y feriados', horas: '09:00 - 23:00' },
  ],
  galeria: [
    { url: '/images/fondo cancha.jpg', alt: 'Cancha de pádel' },
    { url: '/images/tapia.png', alt: 'Jugador en acción' },
    { url: '/images/galan.jpg', alt: 'Partido en el complejo' },
    { url: '/images/coello.jpg', alt: 'Vista del complejo' },
  ],
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
