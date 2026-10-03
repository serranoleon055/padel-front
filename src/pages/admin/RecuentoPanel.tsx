import { ClipboardCheck, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { recuentosApi, type RecuentoResponse } from '@/features/ventas/recuentosApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { fechaISO, formatearFecha, formatearFechaHora, formatearMoneda } from '@/shared/lib/formatters'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { Input } from '@/shared/ui/Input'
import { StatusMessage } from '@/shared/ui/StatusMessage'
import { useToast } from '@/shared/ui/Toast'

type Props = {
  /** Se llama al aplicar un conteo, para que el stock de la lista se actualice. */
  onAplicado: () => void
}

/**
 * El conteo físico del depósito.
 *
 * <p>Se abre la planilla con lo que el sistema cree que hay, se anota lo que hay de
 * verdad, y recién al aplicarla salen los ajustes. Mientras tanto no se tocó una sola
 * unidad: contar y corregir son dos actos distintos.
 */
export function RecuentoPanel({ onAplicado }: Props) {
  const { success: avisoExito } = useToast()
  const [enCurso, setEnCurso] = useState<RecuentoResponse | null>(null)
  const [anteriores, setAnteriores] = useState<RecuentoResponse[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [aAplicar, setAAplicar] = useState(false)
  const [aDescartar, setADescartar] = useState(false)

  /** Lo tipeado por renglón, antes de mandarlo. Vacío = sin contar. */
  const [contado, setContado] = useState<Record<number, string>>({})

  const cargar = useCallback(() => {
    setCargando(true)
    Promise.all([recuentosApi.enCurso(), recuentosApi.listar(0, 10)])
      .then(([abierto, historial]) => {
        setEnCurso(abierto)
        setContado(abierto ? desdeRespuesta(abierto) : {})
        setAnteriores(historial.contenido.filter((r) => r.estado === 'APLICADO'))
        setError(null)
      })
      .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
      .finally(() => setCargando(false))
  }, [])

  useEffect(cargar, [cargar])

  function desdeRespuesta(recuento: RecuentoResponse): Record<number, string> {
    const valores: Record<number, string> = {}
    for (const item of recuento.items ?? []) {
      valores[item.id] = item.stockContado == null ? '' : String(item.stockContado)
    }
    return valores
  }

  async function abrir() {
    setGuardando(true)
    try {
      const abierto = await recuentosApi.abrir(fechaISO())
      setEnCurso(abierto)
      setContado(desdeRespuesta(abierto))
      setError(null)
      avisoExito('Planilla abierta. Contá y después aplicala.')
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    } finally {
      setGuardando(false)
    }
  }

  /** Manda lo tipeado. El stock no se mueve hasta aplicar. */
  async function guardarConteo() {
    if (!enCurso) return
    setGuardando(true)
    try {
      const items = (enCurso.items ?? []).map((item) => ({
        itemId: item.id,
        stockContado: contado[item.id]?.trim() ? Number(contado[item.id]) : null,
      }))
      const actualizado = await recuentosApi.contar(enCurso.id, items)
      setEnCurso(actualizado)
      setContado(desdeRespuesta(actualizado))
      setError(null)
      avisoExito('Conteo guardado.')
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    } finally {
      setGuardando(false)
    }
  }

  /**
   * Aplicar guarda primero lo tipeado.
   *
   * <p>Sin eso, la persona cuenta la góndola entera, toca "aplicar" y el backend aplica lo
   * que tenía guardado —nada— sin un solo error a la vista.
   */
  async function aplicar() {
    if (!enCurso) return
    setGuardando(true)
    try {
      await recuentosApi.contar(enCurso.id, (enCurso.items ?? []).map((item) => ({
        itemId: item.id,
        stockContado: contado[item.id]?.trim() ? Number(contado[item.id]) : null,
      })))
      await recuentosApi.aplicar(enCurso.id)
      setAAplicar(false)
      avisoExito('Conteo aplicado. El stock quedó como lo contaste.')
      onAplicado()
      cargar()
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e)); setAAplicar(false)
    } finally {
      setGuardando(false)
    }
  }

  async function descartar() {
    if (!enCurso) return
    try {
      await recuentosApi.descartar(enCurso.id)
      setADescartar(false)
      avisoExito('Planilla descartada. No se tocó nada.')
      cargar()
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e)); setADescartar(false)
    }
  }

  /**
   * Lo que se perdería al aplicar, con lo tipeado hasta ahora.
   *
   * <p>Se calcula sobre lo tipeado y no sobre lo que devolvió el servidor: el que cuenta
   * tiene que ver el faltante mientras carga, no después de guardar.
   */
  const resumen = useMemo(() => {
    const items = enCurso?.items ?? []
    let contados = 0
    let faltan = 0
    let sobran = 0
    let valorFaltante = 0
    for (const item of items) {
      const texto = contado[item.id]?.trim()
      if (!texto) continue
      contados += 1
      const diferencia = Number(texto) - item.stockSistema
      if (diferencia < 0) {
        faltan += 1
        valorFaltante += (item.costoUnitario ?? 0) * Math.abs(diferencia)
      } else if (diferencia > 0) {
        sobran += 1
      }
    }
    return { contados, faltan, sobran, valorFaltante }
  }, [enCurso, contado])

  if (cargando) {
    return <div className="mt-4"><StatusMessage type="loading" title="Cargando el conteo..." /></div>
  }

  return (
    <div className="mt-4">
      {error && <p role="alert" className="mb-3 text-sm font-bold text-rp-danger">{error}</p>}

      {!enCurso ? (
        <div className="rounded-lg border border-rp-border bg-rp-surface/82 p-5">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-rp-muted">
            <ClipboardCheck size={15} />Contar el depósito
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-rp-muted">
            Se arma una planilla con lo que el sistema cree que hay de cada producto. Anotás
            lo que contaste y, al aplicarla, el stock se corrige solo y queda registrado qué
            faltó y cuánto valía. Hasta que la apliques no se toca nada.
          </p>
          <div className="mt-4">
            <Button size="sm" onClick={abrir} disabled={guardando}>
              <ClipboardCheck size={15} />{guardando ? 'Abriendo...' : 'Empezar un conteo'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-rp-border bg-rp-surface/82">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rp-border px-4 py-3">
            <div>
              <p className="text-sm font-black text-rp-text">
                Conteo del {formatearFecha(enCurso.fecha)}
              </p>
              <p className="text-xs text-rp-muted">
                {resumen.contados} de {enCurso.total} contados
                {resumen.faltan > 0 && ` · faltan en ${resumen.faltan}`}
                {resumen.sobran > 0 && ` · sobran en ${resumen.sobran}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-rp-muted">Faltante</span>
              <span className="text-lg font-black text-rp-danger">
                {formatearMoneda(resumen.valorFaltante)}
              </span>
            </div>
          </div>

          <ul className="divide-y divide-rp-border">
            {(enCurso.items ?? []).map((item) => {
              const texto = contado[item.id] ?? ''
              const diferencia = texto.trim() ? Number(texto) - item.stockSistema : null
              return (
                <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="basis-full text-sm font-bold text-rp-text sm:flex-1 sm:basis-auto">
                    {item.productoNombre}
                  </span>
                  <span className="text-xs text-rp-muted">
                    El sistema dice <b className="text-rp-text">{item.stockSistema}</b>
                  </span>
                  <div className="w-24">
                    <Input
                      id={`contado-${item.id}`}
                      aria-label={`Unidades contadas de ${item.productoNombre}`}
                      soloNumeros
                      placeholder="Contá"
                      value={texto}
                      onChange={(e) => setContado((actual) => ({ ...actual, [item.id]: e.target.value }))}
                    />
                  </div>
                  <span className={`w-20 text-right text-sm font-black ${
                    diferencia == null ? 'text-rp-muted'
                      : diferencia < 0 ? 'text-rp-danger'
                      : diferencia > 0 ? 'text-rp-accent' : 'text-rp-muted'
                  }`}>
                    {diferencia == null ? '—' : diferencia > 0 ? `+${diferencia}` : diferencia}
                  </span>
                </li>
              )
            })}
          </ul>

          <div className="flex flex-wrap justify-end gap-2 border-t border-rp-border px-4 py-3">
            <Button variant="ghost" size="sm" onClick={() => setADescartar(true)}>
              <Trash2 size={15} />Descartar
            </Button>
            <Button variant="subtle" size="sm" onClick={guardarConteo} disabled={guardando}>
              Guardar lo contado
            </Button>
            <Button size="sm" onClick={() => setAAplicar(true)} disabled={guardando || resumen.contados === 0}>
              <ClipboardCheck size={15} />Aplicar al stock
            </Button>
          </div>
        </div>
      )}

      {anteriores.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-black uppercase tracking-[0.14em] text-rp-muted">
            Conteos anteriores
          </h2>
          <ul className="mt-3 divide-y divide-rp-border rounded-lg border border-rp-border bg-rp-surface/82">
            {anteriores.map((recuento) => (
              <li key={recuento.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-rp-text">{formatearFecha(recuento.fecha)}</p>
                  <p className="text-xs text-rp-muted">
                    {recuento.total} productos · aplicado {formatearFechaHora(recuento.aplicadoEn)}
                    {recuento.aplicadoPor ? ` por ${recuento.aplicadoPor}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-rp-danger">
                    −{formatearMoneda(recuento.faltanteValorizado)}
                  </p>
                  {recuento.sobranteValorizado > 0 && (
                    <p className="text-xs text-rp-accent">
                      +{formatearMoneda(recuento.sobranteValorizado)} de sobrante
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <ConfirmDialog
        isOpen={aAplicar}
        onClose={() => setAAplicar(false)}
        onConfirm={aplicar}
        title="Aplicar el conteo"
        description={`El stock se corrige con lo que contaste y queda registrado que faltaron ${formatearMoneda(resumen.valorFaltante)}. Los productos que no contaste no se tocan. Esto no se puede deshacer.`}
        confirmLabel="Aplicar"
        loadingLabel="Aplicando..."
        tono="normal"
        isLoading={guardando}
      />

      <ConfirmDialog
        isOpen={aDescartar}
        onClose={() => setADescartar(false)}
        onConfirm={descartar}
        title="Descartar la planilla"
        description="Se pierde lo que contaste. El stock no se tocó en ningún momento, así que no hay nada que revertir."
        confirmLabel="Descartar"
      />
    </div>
  )
}
