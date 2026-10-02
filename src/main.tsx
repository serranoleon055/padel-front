import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/600.css'
import '@fontsource/montserrat/700.css'
import '@fontsource/montserrat/800.css'
import '@fontsource/montserrat/900.css'
import '@fontsource/dm-mono/400.css'
import '@fontsource/dm-mono/500.css'

import './index.css'
// Paleta del club. Va después de index.css porque solo sobreescribe tokens. Se elige en
// el build con VITE_BRAND_THEME; ver src/styles/temas/LEEME.md.
import '@tema-club'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
