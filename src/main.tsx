import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Fuentes self-hosted (antes venían de Google Fonts por CDN)
import '@fontsource/montserrat/300.css'
import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import '@fontsource/montserrat/700.css'
import '@fontsource/montserrat/800.css'
import '@fontsource/montserrat/900.css'
import '@fontsource/dm-mono/400.css'
import '@fontsource/dm-mono/500.css'
// Iconos self-hosted (antes venían de jsdelivr por CDN)
import '@tabler/icons-webfont/dist/tabler-icons.min.css'

import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
