import { CreditCard, Tag } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useConfiguracionSede } from '@/app/providers/ConfiguracionSedeContext'
import { canchasApi, placesApi } from '@/features/catalog/catalogApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { formatearMoneda } from '@/shared/lib/formatters'
import type { CanchaResponse, LugarResponse } from '@/shared/types/api'
import { Select } from '@/shared/ui/Select'
import { StatusMessage } from '@/shared/ui/StatusMessage'

export default function PreciosPage() {
  const { configuracion } = useConfiguracionSede()
  const [lugares, setLugares] = useState<LugarResponse[]>([])
  const [lugarId, setLugarId] = useState<number | null>(null)
  const [canchas, setCanchas] = useState<CanchaResponse[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let montado = true
    placesApi.getAll()
      .then((datos) => {
        if (!montado) return
        setLugares(datos)
        setLugarId((actual) => actual ?? datos[0]?.id ?? null)
        if (datos.length === 0) setCargando(false)
      })
      .catch((e: unknown) => { if (montado) { setError(obtenerMensajeErrorApi(e)); setCargando(false) } })
    return () => { montado = false }
  }, [])

  useEffect(() => {
    if (lugarId == null) return
    let montado = true
    setCargando(true)
    canchasApi.getAll(lugarId)
      .then((datos) => { if (montado) { setCanchas(datos.filter((cancha) => cancha.activo)); setError(null) } })
      .catch((e: unknown) => { if (montado) setError(obtenerMensajeErrorApi(e)) })
      .finally(() => { if (montado) setCargando(false) })
    return () => { montado = false }
  }, [lugarId])

  const cargaInicial = cargando && canchas.length === 0

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-rp-accent">Tarifas</p>
      <h1 className="mt-2 text-3xl font-black text-rp-text sm:text-4xl">Precios</h1>
      <p className="mt-2 text-sm text-rp-muted">Los precios son por hora. El valor del turno depende de su duración (60, 90 o 120 minutos). Reservá online y pagá la seña para asegurar la cancha.</p>

      <div className="mt-6 w-full sm:w-72">
        <Select label="Sucursal" value={lugarId ?? ''} onChange={(e) => setLugarId(e.target.value ? Number(e.target.value) : null)}>
          {lugares.map((lugar) => <option key={lugar.id} value={lugar.id}>{lugar.nombre}</option>)}
        </Select>
      </div>

      <h2 className="mt-8 flex items-center gap-2 text-lg font-black text-rp-text"><Tag size={18} className="text-rp-accent" />Precio por cancha</h2>
      <div className="mt-4">
        {error ? (
          <StatusMessage type="error" title="Error" description={error} />
        ) : cargaInicial ? (
          <StatusMessage type="loading" title="Cargando precios..." />
        ) : canchas.length === 0 ? (
          <StatusMessage type="empty" title="Sin canchas" description="Esta sucursal todavía no tiene canchas cargadas." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" style={{ transition: 'opacity .15s ease', opacity: cargando ? 0.5 : 1 }}>
            {canchas.map((cancha) => (
              <article key={cancha.id} className="rounded-lg border border-rp-border bg-rp-surface/82 p-4">
                <h3 className="text-sm font-black text-rp-text">{cancha.nombre}</h3>
                <p className="mt-2 text-2xl font-black text-rp-accent">
                  {cancha.precioPorHora != null ? formatearMoneda(cancha.precioPorHora) : 'A consultar'}
                  {cancha.precioPorHora != null && <span className="text-sm font-bold text-rp-muted"> /hora</span>}
                </p>
                {cancha.descripcion && <p className="mt-1 text-xs text-rp-muted">{cancha.descripcion}</p>}
              </article>
            ))}
          </div>
        )}
      </div>

      {configuracion.formasPago.length > 0 && (
        <>
          <h2 className="mt-10 flex items-center gap-2 text-lg font-black text-rp-text"><CreditCard size={18} className="text-rp-accent" />Formas de pago</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {configuracion.formasPago.map((forma) => (
              <span key={forma} className="rounded-md border border-rp-border bg-rp-surface px-3 py-1.5 text-sm font-bold text-rp-muted">{forma}</span>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
