import { useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * La página de un listado, guardada en la URL en vez de en estado local.
 *
 * <p>En estado local la página se perdía cada vez que se salía de la pantalla: entrar a un
 * torneo, guardarlo y volver dejaba al que estaba trabajando en la página 1, buscando de
 * nuevo la fila que acababa de tocar. En la URL sobrevive al botón de volver del navegador
 * y a cualquier enlace que conserve el query string.
 *
 * <p>Se escribe con `replace` a propósito: pasar de página no es un paso del historial, así
 * que volver atrás sale del listado y no recorre página por página. La página 1 no se
 * escribe, para que la URL limpia siga siendo la del principio.
 */
export function usePaginaEnUrl(clave = 'pagina'): [number, (pagina: number) => void] {
  const [searchParams, setSearchParams] = useSearchParams()

  const pagina = Math.max(1, Math.trunc(Number(searchParams.get(clave))) || 1)

  const setPagina = useCallback((siguiente: number) => {
    setSearchParams((previo) => {
      const params = new URLSearchParams(previo)
      if (siguiente <= 1) params.delete(clave)
      else params.set(clave, String(siguiente))
      return params
    }, { replace: true })
  }, [clave, setSearchParams])

  return [pagina, setPagina]
}

/**
 * Vuelve a la página 1 cuando cambia un filtro, **salteando el montaje**.
 *
 * <p>Los listados hacían esto con un `useEffect(() => setPagina(1), [filtro])`. Con la
 * página en estado local daba igual que corriera al montar, porque ya valía 1; con la
 * página en la URL, ese primer disparo la borraba apenas se entraba a la pantalla, y
 * volver de guardar caía en la primera página igual que antes — el arreglo se anulaba a
 * sí mismo, sin ningún error a la vista.
 *
 * <p>Las dependencias se comparan por valor, así que sirve tanto para un texto de búsqueda
 * como para una lista de filtros.
 */
export function useReiniciarPaginaAlFiltrar(setPagina: (pagina: number) => void, filtros: unknown[]) {
  const clave = JSON.stringify(filtros)
  const anterior = useRef(clave)

  useEffect(() => {
    if (anterior.current === clave) return
    anterior.current = clave
    setPagina(1)
  }, [clave, setPagina])
}
