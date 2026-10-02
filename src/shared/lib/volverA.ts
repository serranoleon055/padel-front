import { useLocation } from 'react-router-dom'

/**
 * El "volver" de las pantallas que se abren desde un listado.
 *
 * <p>Un destino escrito a mano —`/admin/torneos`— tira al que estaba trabajando a la
 * primera página, sin los filtros que tenía puestos. El listado guarda su estado en la URL
 * ({@link usePaginaEnUrl}), así que alcanza con arrastrar esa URL: cada enlace que sale del
 * listado manda {@link useUrlActual} en el `state` de la navegación, y la pantalla de
 * destino la lee con este hook para su botón de volver y para el después de guardar.
 *
 * <p>Entrando por un enlace directo o recargando no hay `state`, y ahí se usa el destino
 * por defecto.
 */
export function useVolverA(porDefecto: string) {
  const location = useLocation()
  return (location.state as { volverA?: string } | null)?.volverA ?? porDefecto
}

/** La URL de esta pantalla con su query string, para pasarla como `volverA`. */
export function useUrlActual() {
  const location = useLocation()
  return location.pathname + location.search
}
