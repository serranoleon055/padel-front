import { AlertTriangle, CalendarDays, Info, MapPin, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'

import { authApi } from '@/features/auth/authApi'
import { panelOrganizadorApi } from '@/features/organizador/panelApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { formatearEnum, formatearFecha, formatearMoneda } from '@/shared/lib/formatters'
import type { PanelOrganizador } from '@/shared/types/api'
import { AdminPageHeader } from '@/shared/ui/AdminPageHeader'
import { StatusMessage } from '@/shared/ui/StatusMessage'

/** A dónde lleva cada alerta: la pestaña del torneo donde se resuelve. */
function enlaceAlerta(torneoId: number, vista: string) {
  return vista === 'inscripciones' ? `/admin/torneos/${torneoId}/inscripciones` : `/admin/torneos/${torneoId}?vista=${vista}`
}

/**
 * El panel del organizador: qué resolver hoy, cómo viene cada torneo en marcha (cupos,
 * horarios, cobros, deuda con los clubes) y cuánto dejó cada uno de los que terminaron.
 */
export default function PanelOrganizadorPage() {
  const [panel, setPanel] = useState<PanelOrganizador | null>(null)
  const [error, setError] = useState<string | null>(null)
  const esDuenio = authApi.esDuenio()

  useEffect(() => {
    panelOrganizadorApi.obtener().then(setPanel).catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
  }, [])

  if (error) return <StatusMessage type="error" title="No se pudo cargar el panel" description={error} />
  if (!panel) return <StatusMessage type="loading" title="Cargando panel..." />

  return (
    <section className="flex flex-col gap-5">
      <AdminPageHeader title="Panel" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile titulo="Partidos hoy" valor={String(panel.hoy.partidos)} detalle={panel.hoy.partidos > 0 ? `${panel.hoy.jugados} jugados · ${panel.hoy.enJuego} en juego` : 'Sin partidos programados'} />
        <Tile titulo="Torneos en marcha" valor={String(panel.torneos.length)} detalle={`${panel.torneos.reduce((s, t) => s + t.parejas, 0)} parejas anotadas`} />
        <Tile titulo="Para resolver" valor={String(panel.alertas.length)} detalle={(() => { const urgentes = panel.alertas.filter((a) => a.nivel === 'ALTA').length; return urgentes === 1 ? '1 urgente' : `${urgentes} urgentes` })()} />
        {esDuenio && (
          <Tile titulo="Falta cobrar (en marcha)" valor={formatearMoneda(panel.torneos.reduce((s, t) => s + (t.inscripcionesPendiente ?? 0), 0))} detalle="Inscripciones" />
        )}
      </div>

      <div className="rounded-lg border border-rp-border bg-rp-surface/82 p-4">
        <h2 className="text-sm font-black text-rp-text">Para resolver</h2>
        {panel.alertas.length === 0 ? (
          <p className="mt-2 text-sm text-rp-muted">Nada pendiente. Todo al día.</p>
        ) : (
          <ul className="mt-2 flex flex-col divide-y divide-rp-border">
            {panel.alertas.map((a, i) => (
              <li key={i}>
                <NavLink to={enlaceAlerta(a.torneoId, a.vista)} className="flex items-start gap-2 py-2 text-sm hover:text-rp-accent">
                  {a.nivel === 'ALTA'
                    ? <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rp-danger" aria-label="Urgente" />
                    : <Info size={16} className="mt-0.5 shrink-0 text-rp-amber" aria-label="Para mirar" />}
                  <span className="text-rp-text"><b className={a.nivel === 'ALTA' ? 'text-rp-danger' : 'text-rp-amber'}>{a.nivel === 'ALTA' ? 'Urgente' : 'Mirar'}:</b> {a.mensaje}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-black text-rp-text">Torneos en marcha</h2>
        {panel.torneos.length === 0 ? (
          <StatusMessage type="empty" title="No hay torneos en marcha" description="Creá uno desde Torneos." />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {panel.torneos.map((t) => (
              <NavLink key={t.id} to={`/admin/torneos/${t.id}`} className="flex flex-col gap-3 rounded-lg border border-rp-border bg-rp-surface/82 p-4 hover:border-rp-accent">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-black text-rp-text">{t.nombre}</p>
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-rp-muted">
                      <span className="flex items-center gap-1"><CalendarDays size={12} />{t.fechaInicio ? formatearFecha(t.fechaInicio) : 'Sin fecha'}{t.fechaFin && t.fechaFin !== t.fechaInicio ? ` al ${formatearFecha(t.fechaFin)}` : ''}</span>
                      <span className="flex items-center gap-1"><MapPin size={12} />{t.clubes} {t.clubes === 1 ? 'club' : 'clubes'}</span>
                    </p>
                  </div>
                  <span className="rounded-full bg-rp-surface-2 px-2 py-0.5 text-[11px] font-black text-rp-text">{formatearEnum(t.estado)}</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {t.categorias.map((c) => <Medidor key={c.categoria} etiqueta={c.categoria} valor={c.inscriptas} total={c.cupo} unidad="parejas" />)}
                </div>

                <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
                  {t.solicitudesPendientes > 0 && <Chip>{t.solicitudesPendientes} por aprobar</Chip>}
                  {t.partidosSinHorario > 0 && <Chip>{t.partidosSinHorario} sin horario</Chip>}
                  {t.choques > 0 && <Chip peligro>{t.choques} {t.choques === 1 ? 'choque' : 'choques'}</Chip>}
                  {t.jugadoresQueDeben > 0 && <Chip>{t.jugadoresQueDeben} deben inscripción</Chip>}
                </div>

                {esDuenio && (
                  <dl className="grid grid-cols-2 gap-2 border-t border-rp-border pt-2 text-xs sm:grid-cols-4">
                    <Dato titulo="Cobrado" valor={formatearMoneda(t.inscripcionesCobrado ?? 0)} />
                    <Dato titulo="Falta cobrar" valor={formatearMoneda(t.inscripcionesPendiente ?? 0)} />
                    <Dato titulo="Deuda clubes" valor={formatearMoneda(t.deudaClubes ?? 0)} />
                    <Dato titulo="Ganancia proyectada" valor={formatearMoneda(t.resultadoProyectado ?? 0)} negativo={(t.resultadoProyectado ?? 0) < 0} />
                  </dl>
                )}
              </NavLink>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {esDuenio && panel.terminados.length > 0 && (
          <div className="rounded-lg border border-rp-border bg-rp-surface/82 p-4">
            <h2 className="flex items-center gap-2 text-sm font-black text-rp-text"><Trophy size={16} className="text-rp-accent" />Torneos terminados</h2>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.12em] text-rp-muted">
                    <th className="py-1.5 pr-2 font-black">Torneo</th>
                    <th className="py-1.5 pr-2 text-right font-black">Ganancia</th>
                    <th className="py-1.5 pr-2 text-right font-black">Falta cobrar</th>
                    <th className="py-1.5 text-right font-black">Falta pagar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rp-border">
                  {panel.terminados.map((t) => (
                    <tr key={t.id}>
                      <td className="py-1.5 pr-2"><NavLink to={`/admin/torneos/${t.id}?vista=finanzas`} className="font-bold text-rp-text hover:text-rp-accent">{t.nombre}</NavLink><span className="block text-rp-muted">{t.parejas} parejas</span></td>
                      <td className={`py-1.5 pr-2 text-right font-black ${(t.resultadoReal ?? 0) < 0 ? 'text-rp-danger' : 'text-rp-text'}`}>{formatearMoneda(t.resultadoReal ?? 0)}</td>
                      <td className="py-1.5 pr-2 text-right text-rp-text">{formatearMoneda(t.porCobrar ?? 0)}</td>
                      <td className="py-1.5 text-right text-rp-text">{formatearMoneda(t.porPagar ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-rp-muted">Ganancia con lo que ya entró y salió. Si falta cobrar o pagar, todavía puede cambiar.</p>
          </div>
        )}

        {panel.categorias.length > 0 && (
          <div className="rounded-lg border border-rp-border bg-rp-surface/82 p-4">
            <h2 className="text-sm font-black text-rp-text">Categorías más pedidas</h2>
            <p className="text-[11px] text-rp-muted">Parejas anotadas en los torneos en marcha y los últimos terminados.</p>
            <div className="mt-3 flex flex-col gap-2">
              {panel.categorias.map((c) => (
                <Medidor key={c.categoria} etiqueta={c.categoria} valor={c.parejas} total={Math.max(...panel.categorias.map((x) => x.parejas))}
                  textoValor={`${c.parejas} parejas en ${c.torneos} ${c.torneos === 1 ? 'torneo' : 'torneos'}${c.ocupacionPorcentaje != null ? ` · cupo lleno al ${c.ocupacionPorcentaje}%` : ''}`} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function Tile({ titulo, valor, detalle }: { titulo: string; valor: string; detalle: string }) {
  return (
    <div className="rounded-lg border border-rp-border bg-rp-surface/82 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-rp-muted">{titulo}</p>
      <p className="mt-1 text-2xl font-black text-rp-text">{valor}</p>
      <p className="text-[11px] text-rp-muted">{detalle}</p>
    </div>
  )
}

/**
 * Una barra de una sola serie: el valor siempre escrito al lado (la barra acompaña, no
 * informa sola). Sin total, solo el número.
 */
function Medidor({ etiqueta, valor, total, unidad, textoValor }: { etiqueta: string; valor: number; total: number | null; unidad?: string; textoValor?: string }) {
  const porcentaje = total && total > 0 ? Math.min(100, Math.round((100 * valor) / total)) : null
  const texto = textoValor ?? (total ? `${valor} de ${total} ${unidad ?? ''}` : `${valor} ${unidad ?? ''} · sin cupo`)
  return (
    <div title={texto}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-bold text-rp-text">{etiqueta}</span>
        <span className="text-rp-muted">{texto}</span>
      </div>
      {porcentaje != null && (
        <div className="mt-1 h-2 overflow-hidden rounded bg-rp-surface-2" role="meter" aria-valuenow={valor} aria-valuemin={0} aria-valuemax={total ?? undefined} aria-label={etiqueta}>
          <div className="h-full rounded bg-rp-accent" style={{ width: `${porcentaje}%` }} />
        </div>
      )}
    </div>
  )
}

function Chip({ children, peligro = false }: { children: React.ReactNode; peligro?: boolean }) {
  return <span className={`rounded-full px-2 py-0.5 ${peligro ? 'bg-rp-danger/15 text-rp-danger' : 'bg-rp-surface-2 text-rp-text'}`}>{children}</span>
}

function Dato({ titulo, valor, negativo = false }: { titulo: string; valor: string; negativo?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] font-black uppercase tracking-[0.1em] text-rp-muted">{titulo}</dt>
      <dd className={`font-black ${negativo ? 'text-rp-danger' : 'text-rp-text'}`}>{valor}</dd>
    </div>
  )
}
