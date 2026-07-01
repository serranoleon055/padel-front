import { Clock, Mail, MapPin, Phone } from 'lucide-react'

import { useConfiguracionSede } from '@/app/providers/ConfiguracionSedeContext'
import { normalizarMapsEmbed, whatsappUrl } from '@/config/sede'
import { IconoFacebook, IconoInstagram, IconoWhatsApp } from '@/shared/ui/SocialIcons'

export default function ContactoPage() {
  const { configuracion } = useConfiguracionSede()

  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-black text-rp-text">Contacto</h1>
      <p className="mt-3 text-rp-muted">¿Querés reservar una cancha o tenés una consulta sobre torneos e inscripciones? Escribinos.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <a href={whatsappUrl(configuracion.whatsapp, 'Hola! Quería hacer una consulta.')} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg border border-rp-accent/40 bg-rp-accent/5 p-4 hover:border-rp-accent">
            <IconoWhatsApp size={18} className="text-rp-accent" />
            <span className="font-bold text-rp-text">WhatsApp directo</span>
          </a>
          <a href={`mailto:${configuracion.email}`} className="flex items-center gap-3 rounded-lg border border-rp-border bg-rp-surface/82 p-4 hover:border-rp-accent">
            <Mail size={18} className="text-rp-accent" />
            <span className="text-rp-text">{configuracion.email}</span>
          </a>
          <div className="flex items-center gap-3 rounded-lg border border-rp-border bg-rp-surface/82 p-4">
            <Phone size={18} className="text-rp-accent" />
            <span className="text-rp-text">{configuracion.telefono}</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-rp-border bg-rp-surface/82 p-4">
            <MapPin size={18} className="text-rp-accent" />
            <span className="text-rp-text">{configuracion.direccion}</span>
          </div>

          <div className="rounded-lg border border-rp-border bg-rp-surface/82 p-4">
            <div className="flex items-center gap-2 text-sm font-black text-rp-text"><Clock size={16} className="text-rp-accent" />Horarios de atención</div>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-rp-muted">
              {configuracion.horarios.map((horario) => (
                <li key={horario.dias} className="flex justify-between gap-3">
                  <span>{horario.dias}</span>
                  <span className="font-bold text-rp-text">{horario.horas}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3">
            <a href={configuracion.instagram ?? '#'} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center rounded-lg border border-rp-border bg-rp-surface/82 p-3 hover:border-rp-accent" aria-label="Instagram">
              <IconoInstagram size={18} className="text-rp-accent" />
            </a>
            <a href={configuracion.facebook ?? '#'} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center rounded-lg border border-rp-border bg-rp-surface/82 p-3 hover:border-rp-accent" aria-label="Facebook">
              <IconoFacebook size={18} className="text-rp-accent" />
            </a>
          </div>
        </div>

        {normalizarMapsEmbed(configuracion.mapsEmbedUrl) && (
          <div className="overflow-hidden rounded-lg border border-rp-border">
            <iframe
              title="Ubicación"
              src={normalizarMapsEmbed(configuracion.mapsEmbedUrl) ?? undefined}
              className="h-full min-h-[320px] w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}
      </div>
    </section>
  )
}
