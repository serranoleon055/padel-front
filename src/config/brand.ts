const env = import.meta.env as Record<string, string | undefined>

export const brand = {
  name: env.VITE_BRAND_NAME ?? 'RankPadel',
  location: env.VITE_BRAND_LOCATION ?? 'Santiago del Estero',
  country: env.VITE_BRAND_COUNTRY ?? 'Argentina',
  email: env.VITE_BRAND_EMAIL ?? 'info@rankpadel.com',
  phone: env.VITE_BRAND_PHONE ?? '+54 9 385 689-4061',
}
