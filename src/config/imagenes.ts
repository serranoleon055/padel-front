const env = import.meta.env as Record<string, string | undefined>

/**
 * Imágenes de marca del sitio público.
 *
 * Estaban escritas a mano en las páginas, apuntando a fotos de jugadores profesionales
 * (Tapia, Galán, Coello) que venían con la plataforma. Para un club son dos problemas a
 * la vez: son caras reconocibles con marcas de terceros, y no muestran el club que se
 * está vendiendo. Acá se cambian en un solo lugar, o por variable de entorno al rebrandear.
 *
 * Las rutas son de la raíz del sitio: los archivos salen de `public/`, o de
 * `public/marcas/<tema>/`, que se superpone (ver `marcaDelClub` en vite.config.ts).
 */
export const imagenes = {
  /** Lo primero que se ve en el inicio. Se pide con prioridad alta: que sea liviana. */
  portada: env.VITE_BRAND_IMG_PORTADA ?? '/images/tapia.webp',
  /** Fondo de la franja de reserva y de la galería de la sede. */
  cancha: env.VITE_BRAND_IMG_CANCHA ?? '/images/fondo cancha.webp',
  /** Se usa cuando un torneo no tiene foto cargada. */
  torneo: env.VITE_BRAND_IMG_TORNEO ?? '/images/galan.webp',
  /** Tercera foto de la galería de la sede. */
  ambiente: env.VITE_BRAND_IMG_AMBIENTE ?? '/images/coello.webp',
}
