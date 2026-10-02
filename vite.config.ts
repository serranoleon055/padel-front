import fs from 'node:fs'
import path from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type ESBuildOptions, type Plugin, type ProxyOptions } from 'vite'

/**
 * Escribe `sitemap.xml` y `robots.txt` con el dominio real del build.
 *
 * Estaban en `public/` con la URL escrita a mano, apuntando a una demo de Vercel que ya no
 * existe: Google seguía un sitio caído y el sitemap del club no se indexaba nunca. Como
 * cada club tiene su dominio, no puede ser un archivo fijo.
 */
function seoDelSitio(siteUrl: string): Plugin {
  const base = siteUrl.replace(/\/+$/, '')
  const paginas = [
    { ruta: '/', prioridad: '1.0', frecuencia: 'daily' },
    { ruta: '/reservar', prioridad: '0.9', frecuencia: 'daily' },
    { ruta: '/ranking', prioridad: '0.9', frecuencia: 'daily' },
    { ruta: '/torneos', prioridad: '0.8', frecuencia: 'daily' },
    { ruta: '/precios', prioridad: '0.7', frecuencia: 'weekly' },
    { ruta: '/campeones', prioridad: '0.6', frecuencia: 'weekly' },
    { ruta: '/la-sede', prioridad: '0.6', frecuencia: 'monthly' },
    { ruta: '/contacto', prioridad: '0.5', frecuencia: 'monthly' },
  ]

  return {
    name: 'rankpadel-seo',
    apply: 'build',
    closeBundle() {
      const salida = path.resolve(__dirname, 'dist')
      const urls = paginas
        .map(({ ruta, prioridad, frecuencia }) => `  <url>\n    <loc>${base}${ruta}</loc>\n`
          + `    <changefreq>${frecuencia}</changefreq>\n    <priority>${prioridad}</priority>\n  </url>`)
        .join('\n')
      fs.writeFileSync(path.join(salida, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>\n`
        + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`)
      fs.writeFileSync(path.join(salida, 'robots.txt'),
        `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /login\n\nSitemap: ${base}/sitemap.xml\n`)
    },
  }
}

/**
 * Resuelve el archivo de tema del club (`src/styles/temas/<nombre>.css`).
 *
 * Un nombre que no existe tiene que romper el build: si se resolviera en silencio a la
 * paleta base, el cliente recibiría su sistema con los colores de otro y nadie se
 * enteraría hasta verlo en pantalla.
 */
function temaDelClub(nombre: string) {
  const carpeta = path.resolve(__dirname, './src/styles/temas')
  const archivo = path.join(carpeta, `${nombre}.css`)
  if (!fs.existsSync(archivo)) {
    const disponibles = fs.readdirSync(carpeta)
      .filter((f) => f.endsWith('.css'))
      .map((f) => f.replace(/\.css$/, ''))
      .join(', ')
    throw new Error(`VITE_BRAND_THEME="${nombre}" no existe. Temas disponibles: ${disponibles}`)
  }
  return archivo
}

/**
 * Archivos de marca del club: favicon, íconos de la PWA, manifest e imágenes.
 *
 * Viven en `public/marcas/<tema>/` y se superponen a los de `public/`, con las mismas
 * rutas. Así el club no tiene que tocar `index.html` para cambiar su favicon, y un tema
 * sin carpeta propia (el caso de `rankpadel`) simplemente usa los archivos base.
 *
 * Hace falta en los dos modos: en el build copiando a `dist/`, y en `npm run dev` con un
 * middleware, porque el servidor de desarrollo sirve `public/` tal cual.
 */
function marcaDelClub(tema: string): Plugin {
  const carpeta = path.resolve(__dirname, 'public/marcas', tema)
  const hay = fs.existsSync(carpeta)

  return {
    name: 'rankpadel-marca',
    configureServer(server) {
      if (!hay) return
      server.middlewares.use((req, res, next) => {
        const ruta = (req.url || '').split('?')[0]
        const archivo = path.join(carpeta, path.normalize(ruta).replace(/^[\\/]+/, ''))
        if (!archivo.startsWith(carpeta) || !fs.existsSync(archivo) || !fs.statSync(archivo).isFile()) return next()
        res.setHeader('Content-Type', tipoMime(archivo))
        res.end(fs.readFileSync(archivo))
      })
    },
    closeBundle() {
      const salida = path.resolve(__dirname, 'dist')
      if (hay) fs.cpSync(carpeta, salida, { recursive: true })
      // `public/` se copia entero, así que sin esto el sitio de un club publicaría también
      // el logo y los íconos de todos los demás.
      fs.rmSync(path.join(salida, 'marcas'), { recursive: true, force: true })
    },
  }
}

/**
 * Completa los textos de `index.html` (título, descripción, Open Graph, theme-color) con
 * los datos del club. Estaban escritos a mano con el nombre RankPadel: al rebrandear se
 * cambiaban los colores y la pestaña del navegador seguía diciendo otra cosa, que es
 * justo lo que se ve en una captura de pantalla.
 *
 * Solo `VITE_BRAND_NAME` y `VITE_BRAND_LOCATION` son necesarias; el resto se deriva.
 */
function textosDelSitio(env: Record<string, string>): Plugin {
  const nombre = env.VITE_BRAND_NAME || 'RankPadel'
  const ciudad = env.VITE_BRAND_LOCATION || 'Santiago del Estero'
  const valores: Record<string, string> = {
    BRAND_NAME: nombre,
    BRAND_TITLE: env.VITE_BRAND_TITLE || `${nombre} — Turnos, torneos y ranking de pádel en ${ciudad}`,
    BRAND_DESCRIPTION: env.VITE_BRAND_DESCRIPTION
      || `Reservá tu cancha, seguí el ranking y mirá los torneos de ${nombre}, en ${ciudad}.`,
    BRAND_THEME_COLOR: env.VITE_BRAND_THEME_COLOR || '#06100a',
    BRAND_OG_IMAGE: env.VITE_BRAND_OG_IMAGE || '/images/fondo%20cancha.jpg',
  }

  return {
    name: 'rankpadel-textos',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replace(/%(BRAND_\w+)%/g, (original, clave: string) => valores[clave] ?? original),
    },
  }
}

function tipoMime(archivo: string) {
  const ext = path.extname(archivo).toLowerCase()
  return {
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.webmanifest': 'application/manifest+json',
    '.json': 'application/json',
  }[ext] ?? 'application/octet-stream'
}

export default defineConfig(({ mode }) => {
  // El dominio público del club. Sin esto, el sitio se anuncia a sí mismo en una dirección
  // equivocada: previsualizaciones rotas al compartir por WhatsApp y SEO apuntando a otro lado.
  const env = loadEnv(mode, __dirname, 'VITE_')
  const siteUrl = env.VITE_SITE_URL || 'http://localhost:5173'
  // A dónde manda el proxy de desarrollo lo que pide el front. En desarrollo el front
  // habla por rutas relativas (ver `apiClient.ts`), así que este es el único lugar donde
  // figura el puerto del backend del club.
  const backend = env.VITE_API_BASE_URL || 'http://localhost:8080'
  // Una copia por ruta, no un objeto compartido entre las tres: http-proxy se guarda
  // estado dentro de las opciones que recibe, y compartiéndolas `configure` terminaba sin
  // aplicarse en algunas rutas. El síntoma era un 403 "Invalid CORS request" en una demo
  // sí y en otra no, con exactamente la misma configuración.
  const opcionesProxy = (): ProxyOptions => ({
    target: backend,
    changeOrigin: true,
    // Spring valida el header `Origin` aunque el pedido salga de la misma página. Abriendo
    // la demo por la IP de la red, ese Origin es la IP: no está en
    // `APP_CORS_ALLOWED_ORIGINS` y todo vuelve 403, hasta el login. El proxy se presenta
    // con el origen del backend, que es lo que de verdad está haciendo —hablarle desde el
    // servidor de desarrollo, no desde el navegador—, así la IP del momento no tiene que
    // estar escrita en la configuración de ningún backend.
    configure: (proxy) => {
      proxy.on('proxyReq', (peticion) => peticion.setHeader('origin', backend))
    },
  })
  // En el build de producción eliminamos console.* y debugger del bundle.
  const esbuild = (mode === 'production'
    ? { drop: ['console', 'debugger'] }
    : {}) as ESBuildOptions

  return {
    esbuild,
    plugins: [
      react(),
      tailwindcss(),
      seoDelSitio(siteUrl),
      textosDelSitio(env),
      marcaDelClub(env.VITE_BRAND_THEME || 'rankpadel'),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@tema-club': temaDelClub(env.VITE_BRAND_THEME || 'rankpadel'),
      },
    },
    server: {
      // Escucha también en la IP de la red, no solo en localhost: es lo que permite abrir
      // la demo desde el celular para mostrarla o grabarla.
      host: true,
      // El backend de cada club sale de su propio `.env`. Estaba escrito a mano en el
      // 8080, así que las demos que corren en otro puerto no llegaban a su backend y
      // caían todas sobre la base de Royal.
      proxy: Object.fromEntries(
        ['/api', '/auth', '/uploads'].map((ruta) => [ruta, opcionesProxy()]),
      ),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'vendor-react'
            if (id.includes('node_modules/react-router-dom')) return 'vendor-router'
            if (id.includes('node_modules/@radix-ui') || id.includes('node_modules/clsx') || id.includes('node_modules/tailwind-merge')) return 'vendor-ui'
            if (id.includes('node_modules/axios')) return 'vendor-http'
          },
        },
      },
    },
  }
})
