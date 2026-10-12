# Rebranding y alta de un cliente nuevo

Checklist para convertir la base RankPadel en el sistema de un club concreto.
Todo lo que NO está acá (funcionalidad, seguridad, backups) ya viene listo de fábrica.

## 1. Marca en el frontend (build-time)

La marca entera —colores, logo, nombre, favicon, textos del `<head>`— sale de **dos
lugares**: un archivo de tema y un `.env` por club. Ninguna pantalla tiene el nombre ni un
color escrito a mano; si aparece uno, el arreglo es tokenizarlo, no editarlo por cliente.

### 1.1 El tema

`src/styles/temas/<club>.css` es la paleta: un bloque `:root:root` con los tokens y nada
más. Se copia de `royal.css`, que es el ejemplo completo. Lo explica en detalle
`src/styles/temas/LEEME.md`; lo esencial es que los tokens se respetan **por rol**:

| Token | Rol |
|---|---|
| `--rp-green-900/850/800/700` | Superficies oscuras (navbar, pie, menú del panel) y el texto de los títulos. Oscuros en cualquier marca. |
| `--rp-green-600` | Acento decorativo: puntos, bordes, estados. |
| `--rp-cta` / `--rp-cta-hover` | Fondo del botón principal. Tiene que sostener texto blanco: 4.5:1 mínimo. |
| `--color-rp-accent` | Acento de las utilidades de Tailwind (`bg-rp-accent`, `text-rp-accent`). También sostiene texto. |
| `--rp-gold` | Detalle fino, casi siempre translúcido sobre lo oscuro. |
| `--rp-cream` / `--rp-paper` / `--rp-tint-*` | Fondos claros. `--rp-ink`, el texto. |
| `--rp-logo`, `--rp-logo-mask`, `--rp-logo-tamanio`, `--rp-logo-caja` | El logo del navbar, del pie y del panel. |
| `--rp-img-cancha` | Foto de fondo de la franja de reserva. |

### 1.2 El `.env` del club

`.env.<club>` con las variables de marca; se usa con `--mode <club>`:

```bash
npm run dev -- --mode royal
npm run build -- --mode royal
```

| Variable | Para qué |
|---|---|
| `VITE_BRAND_THEME` | Qué archivo de `src/styles/temas/` entra al build. Un nombre inexistente **rompe el build** a propósito. |
| `VITE_BRAND_NAME`, `VITE_BRAND_LOCATION` | Nombre y ciudad. De acá salen el navbar, el pie y, derivados, el título y la descripción del sitio. |
| `VITE_BRAND_EMAIL`, `VITE_BRAND_PHONE`, `VITE_BRAND_COUNTRY` | Contacto por defecto, hasta que el club cargue el suyo en el panel. |
| `VITE_BRAND_THEME_COLOR` | Color de la barra del navegador en Android. **Entre comillas**: sin ellas el `#` abre un comentario y el valor llega vacío. |
| `VITE_BRAND_TITLE`, `VITE_BRAND_DESCRIPTION` | Solo si el texto derivado no sirve. |
| `VITE_BRAND_OG_IMAGE` | Imagen de la previsualización al compartir el link. |
| `VITE_BRAND_IMG_PORTADA`, `_CANCHA`, `_TORNEO`, `_AMBIENTE` | Las fotos del sitio público (`src/config/imagenes.ts`). |
| `VITE_SITE_URL` | Dominio del club: canonical, previsualizaciones, `sitemap.xml` y `robots.txt`, que **los genera el build**. |
| `VITE_API_BASE_URL` | Backend del club. |
| `VITE_MODO` | `CLUB` (default) u `ORGANIZADOR` (organización de torneos que juega en varios clubes: sin turnos, caja ni stock). Tiene que coincidir con `APP_MODO` del backend. |

### 1.3 Los archivos de marca

`public/marcas/<club>/` se **superpone** a `public/` con las mismas rutas, en el build y en
`npm run dev`. Ahí van `favicon.svg`, `manifest.webmanifest`, `icons/` (192, 512, maskable,
apple-touch) e `images/`. Así el `index.html` no se toca nunca.

La carpeta `marcas/` no se publica: el build copia la del club elegido sobre la raíz de
`dist` y borra el resto. Sin eso, el sitio de cada cliente serviría también el logo y las
fotos de todos los demás.

> Los íconos de la PWA son PNG: con un solo SVG, iPhone deja un ícono genérico al agregar a
> inicio. Si el club manda el logo en JPG chico, conviene limpiarle el fondo a negro exacto
> antes de escalar — además de verse mejor, el PNG comprime del orden de diez veces mejor.

### 1.4 Las fotos

El sitio base viene con fotos de jugadores profesionales (Tapia, Galán, Coello) y de una
cancha de torneo. **Para mostrar el sistema alcanzan y quedan bien**: son muestras
ilustrativas y un club sin fotos propias todavía se ve mejor con ellas que con un relleno
gráfico. Se comparten entre todos los temas desde `public/images/`.

**Antes de entregarle el sistema a un cliente que paga sí hay que reemplazarlas** por fotos
del club: son caras reconocibles y marcas de terceros. Se cambian sin tocar código, con las
cuatro variables `VITE_BRAND_IMG_*` apuntando a archivos de `public/marcas/<club>/images/`.

## 2. Marca en runtime (la carga el club desde el panel)

En `/admin/configuracion` (no requiere deploy): nombre visible de la sede, WhatsApp,
Instagram, dirección + Google Maps, horarios, galería de fotos, textos de precios,
token de Mercado Pago del club. **Los nombres de las sedes y canchas, y las fotos de los
torneos, también son datos**: si la base viene de una demo, quedan los del club anterior.

## 3. Infraestructura por cliente

1. **Railway**: nuevo proyecto `<cliente>-prod` (backend + MySQL). Variables según
   `DEPLOY.md` del backend. Agregar `JAVA_TOOL_OPTIONS=-Xmx384m -XX:MaxMetaspaceSize=128m`.
2. **Cloudflare Pages**: nuevo proyecto desde este repo, con las `VITE_*` del punto 1.
   No hace falta un fork por cliente: el tema y el `.env` alcanzan.
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
