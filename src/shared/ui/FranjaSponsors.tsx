import { useEffect, useState } from 'react'

import { sponsorsApi, type SponsorResponse } from '@/features/sponsors/sponsorsApi'
import { resolveSedeAsset } from '@/shared/api/apiClient'

/**
 * Franja de auspiciantes al pie de las páginas públicas.
 *
 * <p>Si el club no cargó ninguno no se dibuja nada: un bloque vacío con el título
 * "Auspiciantes" haría ver que le falta algo. Un error tampoco se muestra — que no
 * carguen los logos no tiene que ensuciar la página del torneo.
 */
export function FranjaSponsors({ lugarId }: { lugarId?: number | null }) {
  const [sponsors, setSponsors] = useState<SponsorResponse[]>([])

  useEffect(() => {
    let activo = true
    sponsorsApi.visibles(lugarId)
      .then((datos) => { if (activo) setSponsors(datos) })
      .catch(() => { if (activo) setSponsors([]) })
    return () => { activo = false }
  }, [lugarId])

  if (sponsors.length === 0) return null

  return (
    <section className="mt-10 border-t border-rp-border pt-6">
      <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-rp-muted">
        Acompañan al club
      </p>
      {/*
        Los logos van grandes: el club le cobra al auspiciante por estar acá y un logo
        chiquito no vale lo que se paga. En celular ocupan media fila cada uno, así se
        leen sin achicarse.
      */}
      <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-7">
        {sponsors.map((sponsor) => {
          const logo = (
            <img
              src={resolveSedeAsset(sponsor.logoUrl) ?? sponsor.logoUrl}
              alt={sponsor.nombre}
              loading="lazy"
              className="max-h-20 w-auto max-w-[190px] object-contain opacity-85 transition hover:opacity-100 sm:max-h-24 sm:max-w-[240px]"
            />
          )
          return (
            <li key={sponsor.id}>
              {sponsor.enlace ? (
                <a href={sponsor.enlace} target="_blank" rel="noopener noreferrer" title={sponsor.nombre}>
                  {logo}
                </a>
              ) : logo}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
