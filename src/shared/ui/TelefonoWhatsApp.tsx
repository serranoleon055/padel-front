import { enlaceWhatsApp } from '@/shared/lib/whatsapp'
import { IconoWhatsApp } from '@/shared/ui/SocialIcons'

type Props = {
  telefono: string | null | undefined
  /** Texto con el que se abre la conversación. */
  mensaje?: string
}

/**
 * Teléfono del cliente con el botón de WhatsApp al lado. El número queda como texto —se
 * lee y se copia— y el que abre la conversación es el ícono, que se reconoce de una.
 */
export function TelefonoWhatsApp({ telefono, mensaje }: Props) {
  const enlace = enlaceWhatsApp(telefono, mensaje)

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-xs text-rp-muted">{telefono ?? '-'}</span>
      {enlace && (
        <a
          href={enlace}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
          title={`Escribirle por WhatsApp al ${telefono}`}
          aria-label={`Escribirle por WhatsApp al ${telefono}`}
          // Grande en el celular, que es donde se usa: el club le escribe al cliente desde
          // el teléfono, y 24 px era imposible de acertar con el dedo.
          className="inline-flex size-11 items-center justify-center rounded-md text-[#25D366] transition hover:bg-[#25D366]/15 lg:size-6"
        >
          <IconoWhatsApp size={16} />
        </a>
      )}
    </span>
  )
}
