import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { CircleDot } from 'lucide-react'

type ElementoTicker = {
  label: string
  text: string
}

type PropsBarraTicker = {
  items: ElementoTicker[]
  label?: string
  variant?: 'default' | 'results'
}

const MIN_ELEMENTOS = 8
const PIXELES_POR_SEGUNDO = 46
const DURACION_MIN = 26
const DURACION_MAX = 90

function BarraTickerInterna({ items, label = 'NOVEDADES', variant = 'default' }: PropsBarraTicker) {
  const refGrupo = useRef<HTMLDivElement | null>(null)
  const [duracion, setDuracion] = useState(44)

  const elementosBase = useMemo(() => {
    if (items.length === 0) return []
    return Array.from({ length: Math.max(2, Math.ceil(MIN_ELEMENTOS / items.length)) }).flatMap(() => items)
  }, [items])

  useLayoutEffect(() => {
    const grupo = refGrupo.current
    if (!grupo) return

    const actualizarDuracion = () => {
      const ancho = grupo.scrollWidth
      if (ancho <= 0) return
      setDuracion(Math.min(DURACION_MAX, Math.max(DURACION_MIN, ancho / PIXELES_POR_SEGUNDO)))
    }

    actualizarDuracion()
    const observador = new ResizeObserver(actualizarDuracion)
    observador.observe(grupo)
    window.addEventListener('resize', actualizarDuracion)

    return () => {
      observador.disconnect()
      window.removeEventListener('resize', actualizarDuracion)
    }
  }, [elementosBase])

  if (items.length === 0) return null

  const clase = variant === 'results' ? 'ticker torneo-results-ticker' : 'ticker'
  const estiloTicker = { '--rp-ticker-duration': `${duracion}s` } as CSSProperties

  return (
    <div className={clase}>
      <span className="ticker-label">{label}</span>
      <div className="ticker-track">
        <div className="ticker-inner" style={estiloTicker}>
          <div ref={refGrupo} className="ticker-group">
            {elementosBase.map((elemento, i) => <EntradaTicker key={`${elemento.label}-${i}`} elemento={elemento} />)}
          </div>
          <div className="ticker-group" aria-hidden="true">
            {elementosBase.map((elemento, i) => <EntradaTicker key={`copy-${elemento.label}-${i}`} elemento={elemento} />)}
          </div>
        </div>
      </div>
    </div>
  )
}

function EntradaTicker({ elemento }: { elemento: ElementoTicker }) {
  return (
    <span className="ticker-item">
      <CircleDot size={14} />
      <strong>{elemento.label}</strong>
      <span>{elemento.text}</span>
    </span>
  )
}

export const TickerBar = memo(BarraTickerInterna)
