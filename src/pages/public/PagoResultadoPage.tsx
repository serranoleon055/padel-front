import { useEffect, useRef, useState } from 'react'
import { NavLink, useSearchParams } from 'react-router-dom'

import { pagosApi, type PagoResponse } from '@/features/pagos/pagosApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { formatearMoneda } from '@/shared/lib/formatters'
import { Button } from '@/shared/ui/Button'

const MAXIMO_REINTENTOS = 4
const INTERVALO_REINTENTO_MS = 2500

export default function PagoResultadoPage() {
  const [searchParams] = useSearchParams()
  const pagoId = searchParams.get('pagoId')
  const [pago, setPago] = useState<PagoResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const reintentos = useRef(0)

  const estadoMercadoPago = (searchParams.get('status') ?? searchParams.get('collection_status') ?? '').toLowerCase()
  const pagoFallido = ['rejected', 'failure', 'cancelled', 'cancel', 'null'].includes(estadoMercadoPago)

  useEffect(() => {
    if (!pagoId) {
      setError('No se encontró el pago.')
      setCargando(false)
      return
    }
    let activo = true
    let temporizador: ReturnType<typeof setTimeout> | null = null

    function consultar() {
      pagosApi.obtenerPago(Number(pagoId))
        .then((datos) => {
          if (!activo) return
          setPago(datos)
          setError(null)
          if (datos.estado === 'PENDIENTE' && !pagoFallido && reintentos.current < MAXIMO_REINTENTOS) {
            reintentos.current += 1
            temporizador = setTimeout(consultar, INTERVALO_REINTENTO_MS)
          } else {
            setCargando(false)
          }
        })
        .catch((e: unknown) => {
          if (!activo) return
          setError(obtenerMensajeErrorApi(e))
          setCargando(false)
        })
    }

    async function iniciar() {
      if (pagoFallido) {
        try { await pagosApi.cancelarPagoReserva(Number(pagoId)) } catch { /* el turno se libera igual al expirar */ }
      }
      if (activo) consultar()
    }

    iniciar()
    return () => { activo = false; if (temporizador) clearTimeout(temporizador) }
  }, [pagoId, pagoFallido])

  const esReserva = pago?.concepto === 'RESERVA'

  return (
    <section className="mx-auto max-w-xl px-4 py-16 text-center">
      {cargando ? (
        <>
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-rp-accent/15 text-2xl">⏳</div>
          <h1 className="mt-4 text-2xl font-black text-rp-text">Confirmando tu pago...</h1>
          <p className="mt-2 text-sm text-rp-muted">Esperá unos segundos mientras Mercado Pago nos avisa que la plata entró.</p>
        </>
      ) : pago?.estado === 'APROBADO' ? (
        <>
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-rp-accent/15 text-2xl">✓</div>
          <h1 className="mt-4 text-2xl font-black text-rp-text">¡Pago confirmado!</h1>
          <p className="mt-2 text-sm text-rp-muted">
            {esReserva
              ? 'Tu turno quedó confirmado. Te esperamos en la cancha.'
              : 'Tu lugar quedó asegurado. El club finaliza tu inscripción y te contacta para coordinar.'}
          </p>
          <p className="mt-1 text-xs text-rp-muted">Seña pagada: {formatearMoneda(pago.montoSenia)}</p>
        </>
      ) : pago?.estado === 'PENDIENTE' ? (
        <>
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-rp-accent/15 text-2xl">⏳</div>
          <h1 className="mt-4 text-2xl font-black text-rp-text">Pago en proceso</h1>
          <p className="mt-2 text-sm text-rp-muted">Tu pago todavía no se acreditó. Si ya pagaste, puede demorar unos minutos.</p>
          <Button className="mt-4" variant="subtle" onClick={() => window.location.reload()}>Actualizar estado</Button>
        </>
      ) : (
        <>
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-rp-danger/15 text-2xl">✕</div>
          <h1 className="mt-4 text-2xl font-black text-rp-text">El pago no se completó</h1>
          <p className="mt-2 text-sm text-rp-muted">{error ?? 'El pago fue rechazado o cancelado. Podés intentarlo de nuevo.'}</p>
        </>
      )}

      <div className="mt-6 flex justify-center gap-3">
        <Button asChild><NavLink to={esReserva ? '/reservar' : '/torneos'}>{esReserva ? 'Volver a reservar' : 'Ver torneos'}</NavLink></Button>
        <Button variant="ghost" asChild><NavLink to="/">Volver al inicio</NavLink></Button>
      </div>
    </section>
  )
}
