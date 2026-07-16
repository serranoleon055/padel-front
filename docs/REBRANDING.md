# Rebranding y alta de un cliente nuevo

Checklist para convertir la base RankPadel en el sistema de un club concreto.
Todo lo que NO está acá (funcionalidad, seguridad, backups) ya viene listo de fábrica.

## 1. Marca en el frontend (build-time)

| Qué | Dónde |
|---|---|
| Nombre, ciudad, email, teléfono | Variables de Vercel/Cloudflare Pages: `VITE_BRAND_NAME`, `VITE_BRAND_LOCATION`, `VITE_BRAND_COUNTRY`, `VITE_BRAND_EMAIL`, `VITE_BRAND_PHONE` (defaults en `src/config/brand.ts`) |
| Paleta de colores | Tokens CSS en `src/index.css` → `:root` (tema claro, ~línea 19) y el bloque `:root` oscuro (~línea 574). Cambiar `--rp-green-*`, `--rp-gold`, `--rp-cream`, etc. Todo el sistema los consume. |
| Logo del navbar | `.nlogo-icon` en `src/index.css` + favicon |
| Favicon / ícono PWA | `public/favicon.svg`. Para el ícono instalable generar también PNG 192×192 y 512×512 y sumarlos a `public/manifest.webmanifest` |
| Manifest PWA | `public/manifest.webmanifest`: `name`, `short_name`, `background_color`, `theme_color` |
| Título y SEO | `index.html`: `<title>`, description, canonical, og:* (dominio + imagen del club), `theme-color` |
| Imagen social (WhatsApp/FB) | `public/images/` — usar nombre de archivo **sin espacios** y actualizar `og:image` |
| Sitemap / robots | `public/sitemap.xml` y `public/robots.txt`: reemplazar el dominio |

## 2. Marca en runtime (la carga el club desde el panel)

En `/admin/configuracion` (no requiere deploy): nombre visible de la sede, WhatsApp,
Instagram, dirección + Google Maps, horarios, galería de fotos, textos de precios,
token de Mercado Pago del club.

## 3. Infraestructura por cliente

1. **Railway**: nuevo proyecto `<cliente>-prod` (backend + MySQL). Variables según
   `DEPLOY.md` del backend. Agregar `JAVA_TOOL_OPTIONS=-Xmx384m -XX:MaxMetaspaceSize=128m`.
2. **Cloudflare Pages**: nuevo proyecto desde este repo (o un fork por cliente si va
   a divergir el diseño), con las `VITE_*` del punto 1 y `VITE_API_BASE_URL` del backend.
3. **Dominio del club** en Cloudflare → Pages + actualizar `APP_CORS_ALLOWED_ORIGINS`
   y `MERCADO_PAGO_BACK_URL_BASE`/`MERCADO_PAGO_NOTIFICATION_URL` en Railway.
4. **Backups**: bucket propio (o prefijo propio) en B2/R2 + secrets del workflow
   `backup-db.yml` en el repo del backend. Probar una restauración.
5. **Monitoreo**: monitor de UptimeRobot para `https://<backend>/actuator/health`
   y para el dominio del front.
6. **Mercado Pago**: cuenta DEL CLUB. El token se carga desde el panel de configuración;
   el secret del webhook va en `MERCADO_PAGO_WEBHOOK_SECRET`. `PAGOS_MODO_DEMO=false`.
   Hacer un pago real de prueba (reserva + inscripción).
7. **Datos**: DB limpia (sin datos de demo). Cargar lugares, canchas, horarios,
   precios, categorías y temporada activa con el club.

## 4. Antes de entregar

- [ ] Login admin con contraseña fuerte propia del club
- [ ] Deep links funcionan (recargar en /ranking y /admin/torneos)
- [ ] Pago real de punta a punta acreditado
- [ ] Backup diario corrió y se restauró una vez
- [ ] Términos y Privacidad revisados con datos del club (canal de baja de datos)
- [ ] Capacitación al dueño + acuerdo de servicio firmado
