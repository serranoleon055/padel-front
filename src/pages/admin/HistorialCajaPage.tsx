import { History } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'

import { cajaApi, type ArqueoHistorico } from '@/features/caja/cajaApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { formatearFecha, formatearFechaHora, formatearMoneda } from '@/shared/lib/formatters'
import { usePaginaEnUrl } from '@/shared/lib/paginacion'
import { AdminPageHeader } from '@/shared/ui/AdminPageHeader'
import { AdminTable, type Column } from '@/shared/ui/AdminTable'
import { Button } from '@/shared/ui/Button'
import { Pagination } from '@/shared/ui/Pagination'

const POR_PAGINA = 20

/**
 * Los arqueos firmados, uno por noche.
 *
 * <p>Es lo que convierte la diferencia del arqueo en información: un faltante suelto no
 * dice nada, pero tres faltantes en las mismas tres noches sí. Por eso los reabiertos
 * también salen en la lista, con quién los reabrió y con qué diferencia se habían
 * firmado: desde V59 la fila queda en vez de borrarse.
 */
export default function HistorialCajaPage() {
  const [pagina, setPagina] = usePaginaEnUrl('pagina')
  const [arqueos, setArqueos] = useState<ArqueoHistorico[]>([])
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    setCargando(true)
    cajaApi.historialCierres(pagina - 1, POR_PAGINA)
      .then((datos) => {
        if (!vigente) return
        setArqueos(datos.contenido)
        setTotal(datos.totalElementos)
        setError(null)
      })
      .catch((e: unknown) => { if (vigente) setError(obtenerMensajeErrorApi(e)) })
      .finally(() => { if (vigente) setCargando(false) })
    return () => { vigente = false }
  }, [pagina])

  const columnas: Column<ArqueoHistorico>[] = [
    {
      key: 'fecha',
      label: 'Jornada',
      render: (arqueo) => (
        <div>
          <p className="text-sm font-bold text-rp-text">{formatearFecha(arqueo.fecha)}</p>
          <p className="text-xs text-rp-muted">
            Cerró {arqueo.cerradoPor ?? 'el sistema'} · {formatearFechaHora(arqueo.cerradoEn)}
          </p>
        </div>
      ),
    },
    {
      key: 'esperado',
      label: 'Esperado',
      render: (arqueo) => <span className="text-sm text-rp-text">{formatearMoneda(arqueo.efectivoEsperado)}</span>,
    },
    {
      key: 'contado',
      label: 'Contado',
      render: (arqueo) => <span className="text-sm text-rp-text">{formatearMoneda(arqueo.efectivoContado)}</span>,
    },
    {
      key: 'diferencia',
      label: 'Diferencia',
      render: (arqueo) => (
        <span className={`text-sm font-bold ${arqueo.diferencia === 0 ? 'text-rp-muted' : arqueo.diferencia < 0 ? 'text-rp-danger' : 'text-rp-accent'}`}>
          {arqueo.diferencia === 0
            ? 'Cuadró'
            : `${arqueo.diferencia < 0 ? 'Faltaron' : 'Sobraron'} ${formatearMoneda(Math.abs(arqueo.diferencia))}`}
        </span>
      ),
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (arqueo) => (
        arqueo.reabiertoEn
          ? (
            <div>
              <span className="rounded-full bg-rp-danger/15 px-2 py-0.5 text-[11px] font-bold text-rp-danger">Reabierto</span>
              <p className="mt-1 text-xs text-rp-muted">
                {arqueo.reabiertoPor ?? 'Alguien'} · {formatearFechaHora(arqueo.reabiertoEn)}
                {arqueo.motivoReapertura ? ` · ${arqueo.motivoReapertura}` : ''}
              </p>
            </div>
          )
          : <span className="text-xs text-rp-muted">Firmado</span>
      ),
    },
    {
      key: 'notas',
      label: 'Notas',
      render: (arqueo) => <span className="text-xs text-rp-muted">{arqueo.notas ?? '—'}</span>,
    },
  ]

  return (
    <section>
      <AdminPageHeader
        title={<><History size={26} />Historial de arqueos</>}
        action={<Button size="sm" variant="subtle" asChild><NavLink to="/admin/caja">Volver a la caja</NavLink></Button>}
      />

      <p className="mt-2 max-w-2xl text-sm text-rp-muted">
        Los totales son los que se congelaron al firmar cada noche: corregir un turno viejo
        no mueve un arqueo ya cerrado. Los reabiertos también aparecen, con quién los
        reabrió.
      </p>

      <div className="mt-5">
        <AdminTable
          columns={columnas}
          rows={arqueos}
          getRowKey={(arqueo) => arqueo.id}
          isLoading={cargando}
          error={error}
          emptyTitle="Todavía no se cerró ninguna caja"
          emptyDescription="Cuando cierres el día desde la pantalla de Caja, el arqueo firmado va a aparecer acá."
        />
        <Pagination page={pagina} pageSize={POR_PAGINA} total={total} onPageChange={setPagina} />
      </div>
    </section>
  )
}
