import { CalendarClock, MapPin, Ticket } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { useConfiguracionSede } from '@/app/providers/ConfiguracionSedeContext'
import { reservasApi, type TurnoPublico } from '@/features/reservas/reservasApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { formatearFechaLarga, formatearMoneda } from '@/shared/lib/formatters'
import { enlaceWhatsApp } from '@/shared/lib/whatsapp'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { StatusMessage } from '@/shared/ui/StatusMessage'

function hhmm(hora: string) {
  return hora.slice(0, 5)
}

const NOMBRE_ESTADO: Record<string, string> = {
  PENDIENTE: 'A confirmar por el club',
  CONFIRMADA: 'Confirmado',
  FINALIZADA: 'Jugado',
  CANCELADA: 'Cancelado',
  RECHAZADA: 'Rechazado',
  EXPIRADA: 'Vencido',
  NO_SHOW: 'No se presentó',
}

/**
 * El turno visto por el jugador, sin cuenta ni contraseña: entra por el enlace que le
 * llegó y ese enlace autoriza ese turno y nada más.
 *
 * <p>Existe para sacarle al club las dos llamadas de siempre: "¿me quedó el turno?" y
 * "no voy a poder ir". La segunda además le devuelve al club una hora que puede revender.
 */
export default function MiTurnoPage() {
  const { token = '' } = useParams()
  const { configuracion } = useConfiguracionSede()
  const [turno, setTurno] = useState<TurnoPublico | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [avisoCancelado, setAvisoCancelado] = useState(false)

  useEffect(() => {
    let vigente = true
    reservasApi.miTurno(token)
      .then((datos) => { if (vigente) { setTurno(datos); setError(null) } })
      .catch((e: unknown) => { if (vigente) setError(obtenerMensajeErrorApi(e)) })
      .finally(() => { if (vigente) setCargando(false) })
    return () => { vigente = false }
  }, [token])

  async function cancelar() {
    setCancelando(true)
    try {
      setTurno(await reservasApi.cancelarMiTurno(token))
      setAvisoCancelado(true)
      setError(null)
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    } finally {
      setCancelando(false)
      setConfirmando(false)
    }
  }

  if (cargando) {
    return <section className="mx-auto max-w-xl px-4 py-12"><StatusMessage type="loading" title="Buscando tu turno..." /></section>
  }

  if (!turno) {
    return (
      <section className="mx-auto max-w-xl px-4 py-12">
        <StatusMessage
          type="error"
          title="No encontramos este turno"
          description={error ?? 'El enlace puede estar incompleto. Escribinos y lo vemos.'}
        />
      </section>
    )
  }

  const activo = turno.estado === 'PENDIENTE' || turno.estado === 'CONFIRMADA'
  const enlaceClub = enlaceWhatsApp(
    configuracion.whatsapp,
    `Hola! Te escribo por mi turno ${turno.codigo} del ${turno.fecha} a las ${hhmm(turno.horaInicio)} hs.`,
  )

  return (
    <section className="mx-auto max-w-xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-rp-accent">Tu turno</p>
      <h1 className="mt-2 text-3xl font-black text-rp-text">
        {activo ? 'Te esperamos' : NOMBRE_ESTADO[turno.estado] ?? turno.estado}
      </h1>

      {avisoCancelado && (
        <p className="mt-4 rounded-md border border-rp-accent/40 bg-rp-accent/10 px-3 py-2 text-sm font-bold text-rp-text">
          Listo, cancelamos tu turno y le avisamos al club.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{error}</p>
      )}

      <div className="mt-5 rounded-lg border border-rp-border bg-rp-surface/82 p-4">
        <p className="flex items-center gap-2 text-lg font-black capitalize text-rp-text">
          <CalendarClock size={18} className="text-rp-accent" />
          {formatearFechaLarga(turno.fecha)}
        </p>
        <p className="mt-1 text-2xl font-black text-rp-text">
          {hhmm(turno.horaInicio)} a {hhmm(turno.horaFin)} hs
        </p>
        <p className="mt-2 flex items-center gap-2 text-sm text-rp-muted">
          <MapPin size={15} />
          {[turno.lugarNombre, turno.canchaNombre].filter(Boolean).join(' · ')}
        </p>
        <p className="mt-1 flex items-center gap-2 text-sm text-rp-muted">
          <Ticket size={15} />
          Código <span className="font-bold text-rp-text">{turno.codigo}</span>
          <span className="ml-1 rounded-full border border-rp-border px-2 py-0.5 text-xs font-bold">
            {NOMBRE_ESTADO[turno.estado] ?? turno.estado}
          </span>
        </p>
      </div>

      {turno.precio != null && turno.precio > 0 && (
        <div className="mt-3 rounded-lg border border-rp-border px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-rp-muted">Precio del turno</span>
            <strong className="text-rp-text">{formatearMoneda(turno.precio)}</strong>
          </div>
          {turno.seniaPagada != null && turno.seniaPagada > 0 && (
            <div className="mt-1 flex items-center justify-between">
              <span className="text-rp-muted">Seña ya pagada</span>
              <strong className="text-rp-accent">{formatearMoneda(turno.seniaPagada)}</strong>
            </div>
          )}
          {turno.saldoPendiente != null && turno.saldoPendiente > 0 && (
            <div className="mt-1 flex items-center justify-between">
              <span className="text-rp-muted">A pagar en el club</span>
              <strong className="text-rp-text">{formatearMoneda(turno.saldoPendiente)}</strong>
            </div>
          )}
        </div>
      )}

      {activo && (
        <div className="mt-5 flex flex-col gap-2">
          {turno.puedeCancelar ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setConfirmando(true)}>
                No voy a poder ir
              </Button>
              <p className="text-xs text-rp-muted">
                Podés cancelar hasta {turno.horasMinimasCancelacion} horas antes del turno.
              </p>
            </>
          ) : (
            <p className="rounded-md border border-rp-border px-3 py-2 text-sm text-rp-muted">
              {turno.motivoNoCancelable}
            </p>
          )}
          {enlaceClub && (
            <a
              href={enlaceClub}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-md border border-rp-border px-4 py-2.5 text-sm font-bold text-rp-text transition hover:border-rp-accent"
            >
              Escribirle al club
            </a>
          )}
        </div>
      )}

      {/* Lo de la seña se dice ANTES y no después: el sistema no la devuelve solo, y
          prometer una devolución que no existe es peor que no ofrecer la cancelación. */}
      <ConfirmDialog
        isOpen={confirmando}
        onClose={() => setConfirmando(false)}
        onConfirm={cancelar}
        title="¿Cancelamos tu turno?"
        description={turno.seniaPagada != null && turno.seniaPagada > 0
          ? 'La cancha vuelve a quedar libre.\n\nLa seña que ya pagaste no se devuelve automáticamente: si corresponde, hablalo con el club.'
          : 'La cancha vuelve a quedar libre para otra persona.'}
        confirmLabel="Sí, cancelar"
        loadingLabel="Cancelando..."
        isLoading={cancelando}
      />
    </section>
  )
}
