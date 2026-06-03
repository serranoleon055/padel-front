// Branding configurable por variables de entorno (build-time, Vite).
// Permite revender el producto a distintos clubes sin tocar el código:
// definí VITE_BRAND_* en el entorno (.env / Vercel) y se reflejan en toda la app.
// Los colores y tipografías viven en src/index.css (variables CSS / tema Tailwind).

const env = import.meta.env as Record<string, string | undefined>

export const brand = {
  /** Nombre de la marca o club. */
  name: env.VITE_BRAND_NAME ?? 'RankPadel',
  /** Ubicación / región (subtítulo del logo, hero, footer). */
  location: env.VITE_BRAND_LOCATION ?? 'Santiago del Estero',
  /** País (footer / contacto). */
  country: env.VITE_BRAND_COUNTRY ?? 'Argentina',
  /** Email de contacto público. */
  email: env.VITE_BRAND_EMAIL ?? 'info@rankpadel.com',
  /** Teléfono de contacto público. */
  phone: env.VITE_BRAND_PHONE ?? '+54 9 385 123-4567',
}
