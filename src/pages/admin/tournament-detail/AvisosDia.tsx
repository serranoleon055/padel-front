import { Check, Copy, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'

import { brand } from '@/config/brand'
import { avisosApi, type AvisoEnviado } from '@/features/tournaments/avisosApi'
import { diaDe, etiquetaDia, horaDe } from '@/shared/lib/fixture'
import { enlaceWhatsApp, huella, mensajeHorariosDelDia } from '@/shared/lib/whatsapp'
import type { PartidoFixture } from '@/shared/types/api'
import { Modal } from '@/shared/ui/Modal'

type AvisoJugador = {
  jugadorId: number
  nombre: string
  telefono: string | null
  mensaje: string
  clave: string
  estado: 'pendiente' | 'enviado' | 'cambio'
}

/**
 * Avisar a cada jugador sus horarios de un día por WhatsApp, con un clic. El mensaje
 * junta todos sus partidos del día. Queda registrado a quién se le abrió el mensaje; si
 * después cambia un horario, ese jugador vuelve a figurar como "cambió".
 */
export function AvisosDia({ torneoId, torneoNombre, dia, partidos, avisos, soloJugadores, onRegistrado, onClose }: {
  torneoId: number
  torneoNombre: string
  dia: string | null
  partidos: PartidoFixture[]
  avisos: AvisoEnviado[]
  /** Si viene, solo estos jugadores (el "Avisar" de un partido). */
  soloJugadores?: number[]
  onRegistrado: (aviso: AvisoEnviado) => void
  onClose: () => void
}) {
  const [copiado, setCopiado] = useState<number | null>(null)
  const enlace = `${window.location.origin}/torneos/${torneoId}/horarios`

  const lista = useMemo<AvisoJugador[]>(() => {
    if (!dia) return []
    const delDia = partidos.filter((p) => p.inicio && diaDe(p.inicio) === dia).sort((a, b) => a.inicio!.localeCompare(b.inicio!))
    const porJugador = new Map<number, { nombre: string; telefono: string | null; partidos: PartidoFixture[] }>()
    for (const p of delDia) {
      for (const j of p.jugadores) {
        if (soloJugadores && !soloJugadores.includes(j.id)) continue
        const actual = porJugador.get(j.id) ?? { nombre: j.nombre, telefono: j.telefono, partidos: [] }
        actual.partidos.push(p)
        porJugador.set(j.id, actual)
      }
    }
    const tema = `DIA:${dia}`
    return [...porJugador.entries()]
      .map(([jugadorId, datos]) => {
        const mensaje = mensajeHorariosDelDia({
          organizacion: brand.name,
          torneoNombre,
          jugadorNombre: datos.nombre,
          diaEtiqueta: etiquetaDia(dia).toLowerCase(),
          enlace,
          partidos: datos.partidos.map((p) => {
            const propia = p.jugadores.find((j) => j.id === jugadorId)?.parejaId
            return {
              hora: horaDe(p.inicio!),
              categoria: p.categoriaNombre,
              etapa: p.etapa,
              rival: propia === p.parejaLocalId ? p.visitante : p.local,
              lugar: p.lugarNombre,
              direccion: p.lugarDireccion,
              cancha: p.canchaNombre,
            }
          }),
        })
        const clave = huella(mensaje)
        const registrado = avisos.find((a) => a.jugadorId === jugadorId && a.tema === tema)
        const estado: AvisoJugador['estado'] = !registrado ? 'pendiente' : registrado.clave === clave ? 'enviado' : 'cambio'
        return { jugadorId, nombre: datos.nombre, telefono: datos.telefono, mensaje, clave, estado }
      })
      .sort((a, b) => (a.estado === 'enviado' ? 1 : 0) - (b.estado === 'enviado' ? 1 : 0) || a.nombre.localeCompare(b.nombre))
  }, [dia, partidos, avisos, soloJugadores, torneoNombre, enlace])

  async function registrar(aviso: AvisoJugador) {
    try {
      onRegistrado(await avisosApi.registrar(torneoId, { jugadorId: aviso.jugadorId, tema: `DIA:${dia}`, clave: aviso.clave }))
    } catch {
      // Si no se pudo registrar, el mensaje igual se abrió: no se frena al organizador.
    }
  }

  async function copiar(aviso: AvisoJugador) {
    try {
      await navigator.clipboard.writeText(aviso.mensaje)
      setCopiado(aviso.jugadorId)
      void registrar(aviso)
    } catch {
      setCopiado(null)
    }
  }

  const enviados = lista.filter((a) => a.estado === 'enviado').length

  return (
    <Modal isOpen={Boolean(dia)} onClose={onClose} title={dia ? `Avisos del ${etiquetaDia(dia).toLowerCase()}` : 'Avisos'} size="lg">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-rp-muted">
          Cada jugador recibe un mensaje con todos sus partidos del día. Tocá <b className="text-rp-text">WhatsApp</b> y se abre
          escrito: solo hay que mandarlo. {enviados} de {lista.length} avisados.
        </p>
        {lista.length === 0 && <p className="text-sm text-rp-muted">No hay partidos con horario ese día.</p>}
        <ul className="flex max-h-[60vh] flex-col divide-y divide-rp-border overflow-y-auto">
          {lista.map((aviso) => {
            const link = enlaceWhatsApp(aviso.telefono, aviso.mensaje)
            return (
              <li key={aviso.jugadorId} className="flex flex-col gap-1.5 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-rp-text">{aviso.nombre}</span>
                  <div className="flex items-center gap-2">
                    {aviso.estado === 'enviado' && <span className="flex items-center gap-1 rounded-full bg-rp-accent/15 px-2 py-0.5 text-[11px] font-black text-rp-accent"><Check size={12} />Avisado</span>}
                    {aviso.estado === 'cambio' && <span className="flex items-center gap-1 rounded-full bg-rp-danger/15 px-2 py-0.5 text-[11px] font-black text-rp-danger"><RefreshCw size={12} />Cambió: reenviar</span>}
                    {link ? (
                      <a href={link} target="_blank" rel="noreferrer" onClick={() => void registrar(aviso)} className="rounded-md bg-[#25d366] px-3 py-1.5 text-xs font-black text-white hover:opacity-90">WhatsApp</a>
                    ) : (
                      <span className="text-[11px] text-rp-muted">Sin teléfono</span>
                    )}
                    <button type="button" onClick={() => void copiar(aviso)} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent" title="Copiar mensaje" aria-label="Copiar mensaje">
                      {copiado === aviso.jugadorId ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                <pre className="whitespace-pre-wrap rounded-md bg-rp-bg/60 p-2 font-sans text-[11px] leading-4 text-rp-muted">{aviso.mensaje}</pre>
              </li>
            )
          })}
        </ul>
      </div>
    </Modal>
  )
}
