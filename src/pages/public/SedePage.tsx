import { Beer, Car, Dumbbell, Shirt, ShowerHead, Wifi, type LucideIcon } from 'lucide-react'

import { useConfiguracionSede } from '@/app/providers/ConfiguracionSedeContext'
import { brand } from '@/config/brand'
import { resolveSedeAsset } from '@/shared/api/apiClient'

const SERVICIOS: { icono: LucideIcon; titulo: string; descripcion: string }[] = [
  { icono: Beer, titulo: 'Bar y cantina', descripcion: 'Bebidas, snacks y comidas antes y después de jugar.' },
  { icono: ShowerHead, titulo: 'Vestuarios', descripcion: 'Vestuarios con duchas para hombres y mujeres.' },
  { icono: Dumbbell, titulo: 'Alquiler de paletas', descripcion: 'Paletas y pelotas disponibles en recepción.' },
  { icono: Car, titulo: 'Estacionamiento', descripcion: 'Espacio para dejar tu auto mientras jugás.' },
  { icono: Wifi, titulo: 'WiFi', descripcion: 'Conexión libre en todo el complejo.' },
  { icono: Shirt, titulo: 'Pro shop', descripcion: 'Indumentaria y accesorios de pádel.' },
]

export default function SedePage() {
  const { configuracion } = useConfiguracionSede()

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-rp-accent">La sede</p>
      <h1 className="mt-2 text-3xl font-black text-rp-text sm:text-4xl">{brand.name}</h1>
      <p className="mt-2 text-sm text-rp-muted">Mucho más que canchas: un lugar para venir a jugar, comer algo y compartir.</p>

      <h2 className="mt-8 text-lg font-black text-rp-text">Servicios</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICIOS.map((servicio) => (
          <article key={servicio.titulo} className="rounded-lg border border-rp-border bg-rp-surface/82 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-rp-accent/10 text-rp-accent"><servicio.icono size={20} /></div>
            <h3 className="mt-3 text-sm font-black text-rp-text">{servicio.titulo}</h3>
            <p className="mt-1 text-sm text-rp-muted">{servicio.descripcion}</p>
          </article>
        ))}
      </div>

      {configuracion.galeria.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-black text-rp-text">Galería</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {configuracion.galeria.map((foto) => (
              <div key={foto.url} className="aspect-square overflow-hidden rounded-lg border border-rp-border">
                <img src={resolveSedeAsset(foto.url) ?? foto.url} alt={foto.alt} loading="lazy" className="size-full object-cover" />
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
