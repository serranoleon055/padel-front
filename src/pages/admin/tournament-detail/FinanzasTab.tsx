import { Check, Gift, Handshake, Pencil, Plus, Receipt, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { MEDIOS } from '@/features/caja/cajaApi'
import { sponsorsApi, type SponsorResponse } from '@/features/sponsors/sponsorsApi'
import { finanzasApi, type AporteRequest, type GastoRequest, type PremioRequest } from '@/features/tournaments/finanzasApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { fechaISO, formatearFecha, formatearMoneda } from '@/shared/lib/formatters'
import type { CategoriaGastoTorneo, CategoriaResponse, FinanzasTorneo, MedioDePago, PremioTorneo } from '@/shared/types/api'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { Select } from '@/shared/ui/Select'
import { StatusMessage } from '@/shared/ui/StatusMessage'
import { useToast } from '@/shared/ui/Toast'

const CATEGORIAS_GASTO: { valor: CategoriaGastoTorneo; nombre: string }[] = [
  { valor: 'PELOTAS', nombre: 'Pelotas' },
  { valor: 'TROFEOS', nombre: 'Trofeos y medallas' },
  { valor: 'ARBITRAJE', nombre: 'Arbitraje' },
  { valor: 'FOTOGRAFIA', nombre: 'Fotografía y video' },
  { valor: 'PUBLICIDAD', nombre: 'Publicidad' },
  { valor: 'INDUMENTARIA', nombre: 'Indumentaria' },
  { valor: 'LOGISTICA', nombre: 'Logística (agua, traslados...)' },
  { valor: 'OTRO', nombre: 'Otro' },
]

const PUESTOS = ['Campeón', 'Subcampeón', 'Semifinalistas', 'Mejor jugador']

type FormPremio = PremioRequest & { id: number | null; montoTexto: string }
type FormAporte = AporteRequest & { id: number | null; montoTexto: string }

/**
 * La plata del torneo: cuánto se va a ganar si todo se cobra y se paga, cuánto se ganó
 * hasta hoy, y el detalle de premios, gastos y sponsors. Las inscripciones y lo que se le
 * paga a cada club salen de sus pestañas (Cobros y Clubes).
 */
export function FinanzasTab({ torneoId, categorias }: { torneoId: number; categorias: CategoriaResponse[] }) {
  const { success: avisoExito } = useToast()
  const [datos, setDatos] = useState<FinanzasTorneo | null>(null)
  const [sponsors, setSponsors] = useState<SponsorResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [errorModal, setErrorModal] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const [premio, setPremio] = useState<FormPremio | null>(null)
  const [entrega, setEntrega] = useState<{ premio: PremioTorneo; entregadoA: string } | null>(null)
  const [gasto, setGasto] = useState<(GastoRequest & { montoTexto: string }) | null>(null)
  const [aporte, setAporte] = useState<FormAporte | null>(null)
  const [aAnular, setAAnular] = useState<number | null>(null)

  const cargar = useCallback(() => {
    finanzasApi.obtener(torneoId).then(setDatos).catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
  }, [torneoId])

  useEffect(() => { cargar() }, [cargar])
  useEffect(() => { sponsorsApi.todos().then(setSponsors).catch(() => setSponsors([])) }, [])

  async function ejecutar(accion: () => Promise<FinanzasTorneo>, exito: string, cerrar: () => void) {
    setGuardando(true); setErrorModal(null)
    try {
      setDatos(await accion())
      avisoExito(exito)
      cerrar()
    } catch (e: unknown) {
      setErrorModal(obtenerMensajeErrorApi(e))
    } finally {
      setGuardando(false)
    }
  }

  async function directo(accion: () => Promise<FinanzasTorneo>, exito: string) {
    try {
      setDatos(await accion())
      avisoExito(exito)
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    }
  }

  const monto = (texto: string) => (texto.trim() === '' ? null : Number(texto))

  if (error && !datos) return <StatusMessage type="error" title="No se pudieron cargar las finanzas" description={error} />
  if (!datos) return <StatusMessage type="loading" title="Cargando finanzas..." />

  const b = datos.balance

  return (
    <div className="flex flex-col gap-5">
      {error && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{error}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="Ganancia proyectada" valor={b.resultadoProyectado} ayuda="Si se cobra y se paga todo lo comprometido" signo />
        <Kpi titulo="Ganancia a hoy" valor={b.resultadoReal} ayuda="Con lo que ya entró y ya salió" signo />
        <Kpi titulo="Falta cobrar" valor={b.porCobrar} ayuda="Inscripciones y sponsors" />
        <Kpi titulo="Falta pagar" valor={b.porPagar} ayuda="Clubes y premios" />
      </div>

      <div className="overflow-x-auto rounded-lg border border-rp-border bg-rp-surface/82">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.12em] text-rp-muted">
              <th className="px-3 py-2 font-black">Concepto</th>
              <th className="px-3 py-2 text-right font-black">Comprometido</th>
              <th className="px-3 py-2 text-right font-black">Ya movido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rp-border">
            <Fila nombre="Inscripciones" total={b.inscripcionesEsperado} hecho={b.inscripcionesCobrado} />
            <Fila nombre="Sponsors" total={b.sponsorsComprometido} hecho={b.sponsorsCobrado} />
            <Fila nombre="Clubes" total={egreso(b.clubesAcordado)} hecho={egreso(b.clubesPagado)} />
            <Fila nombre="Premios en plata" total={egreso(b.premiosTotal)} hecho={egreso(b.premiosEntregado)} />
            <Fila nombre="Gastos" total={egreso(b.gastos)} hecho={egreso(b.gastos)} />
            <tr className="font-black">
              <td className="px-3 py-2 text-rp-text">Resultado</td>
              <td className="px-3 py-2 text-right text-rp-text">{formatearMoneda(b.resultadoProyectado)}</td>
              <td className="px-3 py-2 text-right text-rp-text">{formatearMoneda(b.resultadoReal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Seccion icono={Gift} titulo="Premios" accion={<Button size="sm" onClick={() => { setErrorModal(null); setPremio({ id: null, categoriaId: categorias[0]?.id ?? null, puesto: 'Campeón', descripcion: null, monto: null, montoTexto: '' }) }}><Plus size={14} />Premio</Button>}>
        {datos.premios.length === 0 ? <Vacio texto="Sin premios cargados." /> : datos.premios.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-rp-text">{p.puesto}{p.categoriaNombre ? ` · ${p.categoriaNombre}` : ' · General'}</p>
              <p className="text-xs text-rp-muted">
                {[p.monto != null ? formatearMoneda(p.monto) : null, p.descripcion].filter(Boolean).join(' + ')}
                {p.entregado ? ` · entregado${p.entregadoA ? ` a ${p.entregadoA}` : ''}` : p.ganador ? ` · ganó ${p.ganador}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {p.entregado
                ? <button type="button" onClick={() => directo(() => finanzasApi.entregarPremio(torneoId, p.id, { entregado: false, entregadoA: null }), 'Premio desmarcado')} className="flex items-center gap-1 rounded-full bg-rp-accent/15 px-2 py-0.5 text-rp-accent" title="Desmarcar"><Check size={12} /><span className="text-[11px] font-black">Entregado</span></button>
                : <Button size="sm" variant="subtle" onClick={() => { setErrorModal(null); setEntrega({ premio: p, entregadoA: p.ganador ?? '' }) }}>Entregar</Button>}
              {!p.entregado && <BotonIcono titulo="Editar" onClick={() => { setErrorModal(null); setPremio({ id: p.id, categoriaId: p.categoriaId, puesto: p.puesto, descripcion: p.descripcion, monto: p.monto, montoTexto: p.monto != null ? String(p.monto) : '' }) }}><Pencil size={14} /></BotonIcono>}
              {!p.entregado && <BotonIcono titulo="Borrar" peligro onClick={() => directo(() => finanzasApi.quitarPremio(torneoId, p.id), 'Premio borrado')}><Trash2 size={14} /></BotonIcono>}
            </div>
          </div>
        ))}
      </Seccion>

      <Seccion icono={Receipt} titulo="Gastos" accion={<Button size="sm" onClick={() => { setErrorModal(null); setGasto({ fecha: fechaISO(), categoria: 'PELOTAS', descripcion: null, monto: 0, montoTexto: '', medio: 'TRANSFERENCIA' }) }}><Plus size={14} />Gasto</Button>}>
        {datos.gastos.length === 0 ? <Vacio texto="Sin gastos cargados." /> : datos.gastos.map((g) => (
          <div key={g.id} className={`flex flex-wrap items-center justify-between gap-2 py-2 ${g.anulado ? 'opacity-60' : ''}`}>
            <div className="min-w-0">
              <p className={`text-sm font-bold text-rp-text ${g.anulado ? 'line-through' : ''}`}>{CATEGORIAS_GASTO.find((c) => c.valor === g.categoria)?.nombre}{g.descripcion ? ` · ${g.descripcion}` : ''}</p>
              <p className="text-xs text-rp-muted">
                {formatearFecha(g.fecha)} · {MEDIOS.find((m) => m.valor === g.medio)?.nombre}{g.registradoPor ? ` · ${g.registradoPor}` : ''}
                {g.anulado ? ` · anulado por ${g.anuladoPor ?? '?'}${g.motivoAnulacion ? `: ${g.motivoAnulacion}` : ''}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-black text-rp-text">{formatearMoneda(g.monto)}</span>
              {!g.anulado && <BotonIcono titulo="Anular" peligro onClick={() => setAAnular(g.id)}><X size={14} /></BotonIcono>}
            </div>
          </div>
        ))}
      </Seccion>

      <Seccion icono={Handshake} titulo="Sponsors" accion={<Button size="sm" onClick={() => { setErrorModal(null); setAporte({ id: null, sponsorId: null, nombre: '', monto: null, montoTexto: '', descripcion: null, cobrado: false, cobradoEn: null, medio: null }) }}><Plus size={14} />Aporte</Button>}>
        {datos.aportes.length === 0 ? <Vacio texto="Sin aportes de sponsors cargados." /> : datos.aportes.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-rp-text">{a.nombre}</p>
              <p className="text-xs text-rp-muted">{[a.monto != null ? formatearMoneda(a.monto) : null, a.descripcion].filter(Boolean).join(' + ')}</p>
            </div>
            <div className="flex items-center gap-1">
              {a.monto != null && (a.cobrado
                ? <span className="flex items-center gap-1 rounded-full bg-rp-accent/15 px-2 py-0.5 text-[11px] font-black text-rp-accent"><Check size={12} />Cobrado</span>
                : <span className="rounded-full bg-rp-amber/15 px-2 py-0.5 text-[11px] font-black text-rp-amber">A cobrar</span>)}
              <BotonIcono titulo="Editar" onClick={() => { setErrorModal(null); setAporte({ id: a.id, sponsorId: a.sponsorId, nombre: a.nombre, monto: a.monto, montoTexto: a.monto != null ? String(a.monto) : '', descripcion: a.descripcion, cobrado: a.cobrado, cobradoEn: a.cobradoEn, medio: a.medio }) }}><Pencil size={14} /></BotonIcono>
              {!a.cobrado && <BotonIcono titulo="Borrar" peligro onClick={() => directo(() => finanzasApi.quitarAporte(torneoId, a.id), 'Aporte borrado')}><Trash2 size={14} /></BotonIcono>}
            </div>
          </div>
        ))}
      </Seccion>

      <Modal isOpen={Boolean(premio)} onClose={() => setPremio(null)} title={premio?.id ? 'Editar premio' : 'Nuevo premio'} size="sm"
        onSubmit={() => premio && ejecutar(() => {
          const body = { categoriaId: premio.categoriaId, puesto: premio.puesto, descripcion: premio.descripcion || null, monto: monto(premio.montoTexto) }
          return premio.id ? finanzasApi.editarPremio(torneoId, premio.id, body) : finanzasApi.agregarPremio(torneoId, body)
        }, 'Premio guardado', () => setPremio(null))}>
        {premio && (
          <div className="flex flex-col gap-3">
            <ErrorModal texto={errorModal} />
            <Select label="Categoría" value={premio.categoriaId?.toString() ?? ''} onChange={(e) => setPremio({ ...premio, categoriaId: e.target.value ? Number(e.target.value) : null })}>
              <option value="">General del torneo</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>
            <Input label="Puesto" list="puestos-premio" value={premio.puesto} onChange={(e) => setPremio({ ...premio, puesto: e.target.value })} />
            <datalist id="puestos-premio">{PUESTOS.map((p) => <option key={p} value={p} />)}</datalist>
            <Input label="Plata (opcional)" type="number" min={0} value={premio.montoTexto} onChange={(e) => setPremio({ ...premio, montoTexto: e.target.value })} placeholder="100000" />
            <Input label="Qué se entrega (opcional)" value={premio.descripcion ?? ''} onChange={(e) => setPremio({ ...premio, descripcion: e.target.value })} placeholder="Paletas + trofeo" />
            <Botones guardando={guardando} onCancelar={() => setPremio(null)} />
          </div>
        )}
      </Modal>

      <Modal isOpen={Boolean(entrega)} onClose={() => setEntrega(null)} title="Entregar premio" size="sm"
        onSubmit={() => entrega && ejecutar(() => finanzasApi.entregarPremio(torneoId, entrega.premio.id, { entregado: true, entregadoA: entrega.entregadoA || null }), 'Premio entregado', () => setEntrega(null))}>
        {entrega && (
          <div className="flex flex-col gap-3">
            <ErrorModal texto={errorModal} />
            <p className="text-sm text-rp-muted">{entrega.premio.puesto}{entrega.premio.categoriaNombre ? ` · ${entrega.premio.categoriaNombre}` : ''}{entrega.premio.monto != null ? ` · ${formatearMoneda(entrega.premio.monto)}` : ''}</p>
            <Input label="A quién" value={entrega.entregadoA} onChange={(e) => setEntrega({ ...entrega, entregadoA: e.target.value })} placeholder="Pareja ganadora" />
            <Botones guardando={guardando} onCancelar={() => setEntrega(null)} texto="Marcar entregado" />
          </div>
        )}
      </Modal>

      <Modal isOpen={Boolean(gasto)} onClose={() => setGasto(null)} title="Nuevo gasto" size="sm"
        onSubmit={() => gasto && ejecutar(() => finanzasApi.registrarGasto(torneoId, { ...gasto, descripcion: gasto.descripcion || null, monto: Number(gasto.montoTexto) }), 'Gasto registrado', () => setGasto(null))}>
        {gasto && (
          <div className="flex flex-col gap-3">
            <ErrorModal texto={errorModal} />
            <Select label="En qué" value={gasto.categoria} onChange={(e) => setGasto({ ...gasto, categoria: e.target.value as CategoriaGastoTorneo })}>
              {CATEGORIAS_GASTO.map((c) => <option key={c.valor} value={c.valor}>{c.nombre}</option>)}
            </Select>
            <Input label="Detalle (opcional)" value={gasto.descripcion ?? ''} onChange={(e) => setGasto({ ...gasto, descripcion: e.target.value })} placeholder="40 tubos" />
            <Input label="Monto" type="number" min={1} value={gasto.montoTexto} onChange={(e) => setGasto({ ...gasto, montoTexto: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Fecha" type="date" value={gasto.fecha} onChange={(e) => setGasto({ ...gasto, fecha: e.target.value })} />
              <Select label="Cómo se pagó" value={gasto.medio} onChange={(e) => setGasto({ ...gasto, medio: e.target.value as MedioDePago })}>
                {MEDIOS.map((m) => <option key={m.valor} value={m.valor}>{m.nombre}</option>)}
              </Select>
            </div>
            <Botones guardando={guardando} onCancelar={() => setGasto(null)} />
          </div>
        )}
      </Modal>

      <Modal isOpen={Boolean(aporte)} onClose={() => setAporte(null)} title={aporte?.id ? 'Editar aporte' : 'Nuevo aporte de sponsor'} size="sm"
        onSubmit={() => aporte && ejecutar(() => {
          const body: AporteRequest = {
            sponsorId: aporte.sponsorId, nombre: aporte.sponsorId ? null : aporte.nombre, monto: monto(aporte.montoTexto),
            descripcion: aporte.descripcion || null, cobrado: aporte.cobrado, cobradoEn: aporte.cobrado ? (aporte.cobradoEn ?? fechaISO()) : null,
            medio: aporte.cobrado ? (aporte.medio ?? 'TRANSFERENCIA') : null,
          }
          return aporte.id ? finanzasApi.editarAporte(torneoId, aporte.id, body) : finanzasApi.agregarAporte(torneoId, body)
        }, 'Aporte guardado', () => setAporte(null))}>
        {aporte && (
          <div className="flex flex-col gap-3">
            <ErrorModal texto={errorModal} />
            {sponsors.length > 0 && (
              <Select label="Sponsor" value={aporte.sponsorId?.toString() ?? ''} onChange={(e) => setAporte({ ...aporte, sponsorId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Otro (escribir el nombre)</option>
                {sponsors.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </Select>
            )}
            {!aporte.sponsorId && <Input label="Nombre" value={aporte.nombre ?? ''} onChange={(e) => setAporte({ ...aporte, nombre: e.target.value })} placeholder="Bebidas Sur" />}
            <Input label="Plata (opcional)" type="number" min={0} value={aporte.montoTexto} onChange={(e) => setAporte({ ...aporte, montoTexto: e.target.value })} />
            <Input label="Canje (opcional)" value={aporte.descripcion ?? ''} onChange={(e) => setAporte({ ...aporte, descripcion: e.target.value })} placeholder="30 tubos de pelotas" />
            <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-rp-muted">
              <input type="checkbox" className="size-4 accent-rp-accent" checked={aporte.cobrado} onChange={(e) => setAporte({ ...aporte, cobrado: e.target.checked })} />
              Ya se cobró
            </label>
            {aporte.cobrado && (
              <div className="grid grid-cols-2 gap-3">
                <Input label="Fecha" type="date" value={aporte.cobradoEn ?? fechaISO()} onChange={(e) => setAporte({ ...aporte, cobradoEn: e.target.value })} />
                <Select label="Cómo" value={aporte.medio ?? 'TRANSFERENCIA'} onChange={(e) => setAporte({ ...aporte, medio: e.target.value as MedioDePago })}>
                  {MEDIOS.map((m) => <option key={m.valor} value={m.valor}>{m.nombre}</option>)}
                </Select>
              </div>
            )}
            <Botones guardando={guardando} onCancelar={() => setAporte(null)} />
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={aAnular != null} onClose={() => setAAnular(null)} pedirMotivo
        onConfirm={(motivo) => { const id = aAnular; setAAnular(null); if (id != null) void directo(() => finanzasApi.anularGasto(torneoId, id, motivo), 'Gasto anulado') }}
        title="Anular gasto" description="El gasto queda registrado como anulado y deja de contar en el balance." confirmLabel="Anular" loadingLabel="Anulando..." />
    </div>
  )
}

/** Lo que sale, en negativo; un cero queda en cero (no "-$ 0"). */
const egreso = (monto: number) => (monto === 0 ? 0 : -monto)

function Kpi({ titulo, valor, ayuda, signo = false }: { titulo: string; valor: number; ayuda: string; signo?: boolean }) {
  const negativo = signo && valor < 0
  return (
    <div className="rounded-lg border border-rp-border bg-rp-surface/82 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-rp-muted">{titulo}</p>
      <p className={`mt-1 text-xl font-black ${negativo ? 'text-rp-danger' : 'text-rp-text'}`}>{formatearMoneda(valor)}</p>
      <p className="mt-0.5 text-[11px] text-rp-muted">{ayuda}</p>
    </div>
  )
}

function Fila({ nombre, total, hecho }: { nombre: string; total: number; hecho: number }) {
  return (
    <tr>
      <td className="px-3 py-2 text-rp-text">{nombre}</td>
      <td className="px-3 py-2 text-right text-rp-text">{formatearMoneda(total)}</td>
      <td className="px-3 py-2 text-right text-rp-muted">{formatearMoneda(hecho)}</td>
    </tr>
  )
}

function Seccion({ icono: Icono, titulo, accion, children }: { icono: typeof Gift; titulo: string; accion: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-rp-border bg-rp-surface/82 p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-black text-rp-text"><Icono size={16} className="text-rp-accent" />{titulo}</h3>
        {accion}
      </div>
      <div className="divide-y divide-rp-border">{children}</div>
    </section>
  )
}

function Vacio({ texto }: { texto: string }) {
  return <p className="py-2 text-xs text-rp-muted">{texto}</p>
}

function BotonIcono({ titulo, onClick, peligro = false, children }: { titulo: string; onClick: () => void; peligro?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} title={titulo} aria-label={titulo}
      className={`flex size-11 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 lg:size-8 ${peligro ? 'hover:text-rp-danger' : 'hover:text-rp-accent'}`}>
      {children}
    </button>
  )
}

function ErrorModal({ texto }: { texto: string | null }) {
  return texto ? <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{texto}</p> : null
}

function Botones({ guardando, onCancelar, texto = 'Guardar' }: { guardando: boolean; onCancelar: () => void; texto?: string }) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" onClick={onCancelar} disabled={guardando}>Cancelar</Button>
      <Button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : texto}</Button>
    </div>
  )
}
