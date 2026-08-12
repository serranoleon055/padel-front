import { useState } from 'react'

import FormatTemplatesPage from '@/pages/admin/FormatTemplatesPage'
import PointTemplatesPage from '@/pages/admin/PointTemplatesPage'
import { SegmentedToggle } from '@/shared/ui/SegmentedToggle'

type Solapa = 'formato' | 'puntos'

/**
 * Las dos plantillas son lo mismo desde el lado del club —"cómo se juega" y "cuánto
 * suma"— y se cargan juntas al armar un torneo. Tenerlas en dos entradas del menú
 * obligaba a ir y volver.
 */
export default function PlantillasPage() {
  const [solapa, setSolapa] = useState<Solapa>(
    () => (sessionStorage.getItem('rp-plantillas-solapa') as Solapa | null) ?? 'formato',
  )

  function elegir(valor: Solapa) {
    setSolapa(valor)
    sessionStorage.setItem('rp-plantillas-solapa', valor)
  }

  return (
    <section>
      <SegmentedToggle
        className="max-w-md"
        valor={solapa}
        onChange={elegir}
        opciones={[
          { valor: 'formato', label: 'Formato' },
          { valor: 'puntos', label: 'Puntos' },
        ]}
      />
      <div className="mt-4">
        {solapa === 'formato' ? <FormatTemplatesPage /> : <PointTemplatesPage />}
      </div>
    </section>
  )
}
