# Temas por club

Cada archivo de esta carpeta es la identidad visual de un club. Se elige en el build con
`VITE_BRAND_THEME` (sin la variable se usa `rankpadel`, que es la paleta base y no
sobreescribe nada).

Los colores viven acá; los archivos —favicon, íconos de la PWA, manifest, fotos— viven en
`public/marcas/<club>/`, que se superpone a `public/`. Un build publica los archivos de
**su** club y de ningún otro.

```
VITE_BRAND_THEME=royal npm run build
```

El archivo se resuelve en `vite.config.ts` con el alias `@tema-club`, que `main.tsx`
importa **después** de `index.css` para que gane el override. Si el nombre no existe, el
build falla con el listado de temas disponibles en vez de compilar en silencio con la
paleta equivocada.

## Cómo se arma un tema nuevo

1. Copiar `royal.css` y renombrarlo con el club.
2. Reemplazar los valores. **No agregar reglas nuevas ni tokens nuevos**: un tema es una
   lista de colores, no una hoja de estilos. Si hace falta cambiar una regla, el problema
   es que ese color está escrito a mano en `index.css` — tokenizarlo ahí.
3. Los tokens tienen que respetar el rol, no el nombre:
   - `--rp-green-900/850/800/700` son las **superficies oscuras** (navbar, footer, menú del
     panel) y también el color de **texto de los títulos sobre fondo claro**. Tienen que
     quedar oscuros en cualquier marca.
   - `--rp-green-600` es el **acento**: botones, enlaces, estados activos. **También es
     color de texto sobre fondo claro** (los puntos del perfil, la tendencia del ranking,
     el eyebrow del inicio), así que tiene que dar 4.5:1 contra el blanco. El color vivo de
     la marca casi nunca sirve acá: va en el 500, que es decorativo. Le pasó a `upcn`, cuyo
     verde lima daba 1.9:1.
   - `--rp-gold` es el **detalle**: bordes finos, eyebrows, líneas sobre lo oscuro. Casi
     siempre se usa translúcido, así que conviene un color cálido y saturado. Unos pocos
     eyebrows son texto chico sobre fondo claro: el dorado base y el naranja de Royal dan
     ~2.7:1 ahí, y conviene no bajar de ese nivel.
   - `--rp-cream/paper/tint-*` son los fondos claros; `--rp-ink` el texto principal.
4. El bloque `@theme` de Tailwind (`--color-rp-*`) genera las utilidades `bg-rp-accent`,
   `text-rp-muted`, etc. Se sobreescribe igual porque Tailwind v4 compila las utilidades
   contra la variable, no contra el valor.
