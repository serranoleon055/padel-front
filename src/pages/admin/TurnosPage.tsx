import { useSearchParams } from 'react-router-dom'

import TurnosAdminPage from '@/pages/admin/TurnosAdminPage'
import TurnosFijosPage from '@/pages/admin/TurnosFijosPage'
import { SegmentedToggle } from '@/shared/ui/SegmentedToggle'

type Solapa = 'agenda' | 'abonos'

/**
 * Los abonos no son otra cosa que turnos: son la misma agenda vista desde la regla que
 * los genera. Tenerlos en dos entradas del menú hacía que el club tuviera que acordarse
 * de mirar dos pantallas para saber si una cancha estaba libre.
 *
 * <p>La solapa va en la URL para que se pueda compartir el link y para que volver atrás
 * desde una ficha de cliente caiga donde estabas.
 */
export default function TurnosPage() {
  const [params, setParams] = useSearchParams()
  const solapa: Solapa = params.get('ver') === 'abonos' ? 'abonos' : 'agenda'

  function elegir(valor: Solapa) {
    const siguiente = new URLSearchParams(params)
    if (valor === 'agenda') siguiente.delete('ver')
    else siguiente.set('ver', valor)
    setParams(siguiente, { replace: true })
  }

  return (
    <section>
      <SegmentedToggle
        className="max-w-md"
        valor={solapa}
        onChange={elegir}
        opciones={[
          { valor: 'agenda', label: 'Agenda del día' },
          { valor: 'abonos', label: 'Turnos fijos' },
        ]}
      />
      <div className="mt-4">
        {solapa === 'agenda' ? <TurnosAdminPage /> : <TurnosFijosPage />}
      </div>
    </section>
  )
}
