import { Minus, Plus, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useConfiguracionSede } from '@/app/providers/ConfiguracionSedeContext'
import { canchasApi, placesApi } from '@/features/catalog/catalogApi'
import { configuracionSedeApi, type EstadoNotificaciones } from '@/features/configuracion/configuracionApi'
import { horariosCanchaApi, type HorarioCanchaRequest } from '@/features/reservas/reservasApi'
import { resolveSedeAsset } from '@/shared/api/apiClient'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import type { ConfiguracionSede, LugarResponse } from '@/shared/types/api'
import { SponsorsSection } from '@/pages/admin/SponsorsSection'
import { AdminPageHeader } from '@/shared/ui/AdminPageHeader'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { SegmentedToggle } from '@/shared/ui/SegmentedToggle'
import { useToast } from '@/shared/ui/Toast'

const CLAVE_SECCION = 'rp-config-seccion'

type Seccion = 'club' | 'turnos' | 'publico' | 'cobros'

const SECCIONES: { valor: Seccion; label: string }[] = [
  { valor: 'club', label: 'El club' },
  { valor: 'turnos', label: 'Turnos' },
  { valor: 'publico', label: 'La web' },
  { valor: 'cobros', label: 'Cobros y avisos' },
]

const DIAS = [
  { valor: '1', nombre: 'Lun' }, { valor: '2', nombre: 'Mar' }, { valor: '3', nombre: 'Mié' },
  { valor: '4', nombre: 'Jue' }, { valor: '5', nombre: 'Vie' }, { valor: '6', nombre: 'Sáb' },
  { valor: '7', nombre: 'Dom' },
]

const DURACIONES = [60, 90, 120]

const HORARIO_VACIO: HorarioCanchaRequest = {
  canchaId: 0,
  horaApertura: '18:00',
  horaCierre: '23:00',
  diasActivos: '1,2,3,4,5,6,7',
  duracionesOfrecidas: '60,120',
  anticipacionDias: 14,
}

function hhmm(valor: string) {
  return valor.slice(0, 5)
}

function listaDias(valor: string | undefined) {
  return (valor ?? '').split(',').map((d) => d.trim()).filter(Boolean)
}

function listaDuraciones(valor: string | undefined) {
  return (valor ?? '').split(',').map((d) => Number(d.trim())).filter((n) => Number.isFinite(n) && n > 0)
}

function etiquetaDuracion(minutos: number) {
  return minutos === 60 ? '1 hora' : minutos === 90 ? '1 h 30' : `${minutos / 60} horas`
}

/**
 * Todo lo que el club cambia sin llamar a nadie, agrupado por para qué sirve.
 *
 * <p>Antes era una sola columna de bloques sueltos que mezclaba el Instagram con el token
 * de Mercado Pago, y lo que de verdad decide cómo funciona el sistema —a qué hora abre,
 * qué duraciones se venden, con cuánta anticipación se reserva— estaba escondido en un
 * modal adentro de Turnos. Eso ahora vive acá, que es donde se lo busca.
 */
export default function ConfiguracionSedePage() {
  const { configuracion, refrescar } = useConfiguracionSede()
  const { success: avisoExito } = useToast()
  const [seccion, setSeccion] = useState<Seccion>(() => (sessionStorage.getItem(CLAVE_SECCION) as Seccion) ?? 'club')
  const [formulario, setFormulario] = useState<ConfiguracionSede>(configuracion)
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputArchivo = useRef<HTMLInputElement>(null)

  const [notificaciones, setNotificaciones] = useState<EstadoNotificaciones | null>(null)
  const [probando, setProbando] = useState(false)
  const [errorMail, setErrorMail] = useState<string | null>(null)

  const [lugares, setLugares] = useState<LugarResponse[]>([])
  const [lugarId, setLugarId] = useState<number | null>(null)
  const [horario, setHorario] = useState<HorarioCanchaRequest>(HORARIO_VACIO)
  const [guardandoHorario, setGuardandoHorario] = useState(false)
  const [errorHorario, setErrorHorario] = useState<string | null>(null)

  useEffect(() => { sessionStorage.setItem(CLAVE_SECCION, seccion) }, [seccion])
  useEffect(() => { setFormulario(configuracion) }, [configuracion])

  useEffect(() => {
    configuracionSedeApi.estadoNotificaciones().then(setNotificaciones).catch(() => {})
  }, [configuracion])

  useEffect(() => {
    placesApi.getAll()
      .then((datos) => { setLugares(datos); setLugarId((actual) => actual ?? datos[0]?.id ?? null) })
      .catch(() => setLugares([]))
  }, [])

  // El horario se guarda por cancha pero se edita por sucursal: se lee el de la primera
  // cancha y se aplica a todas. Un club no abre una cancha a las 10 y otra a las 18.
  useEffect(() => {
    if (lugarId == null) return
    setErrorHorario(null)
    canchasApi.getAll(lugarId)
      .then(async (canchas) => {
        const primera = canchas[0]
        if (!primera) { setHorario(HORARIO_VACIO); return }
        const lista = await horariosCanchaApi.listar(primera.id)
        const activo = lista.find((h) => h.activo) ?? lista[0]
        setHorario(activo
          ? {
              canchaId: primera.id,
              horaApertura: hhmm(activo.horaApertura),
              horaCierre: hhmm(activo.horaCierre),
              diasActivos: activo.diasActivos ?? '1,2,3,4,5,6,7',
              duracionesOfrecidas: activo.duracionesOfrecidas,
              anticipacionDias: activo.anticipacionDias,
            }
          : { ...HORARIO_VACIO, canchaId: primera.id })
      })
      .catch(() => setHorario(HORARIO_VACIO))
  }, [lugarId])

  async function probarMail() {
    setProbando(true)
    setErrorMail(null)
    try {
      const destino = await configuracionSedeApi.probarNotificaciones()
      avisoExito(`Mail de prueba enviado a ${destino}`)
      setNotificaciones(await configuracionSedeApi.estadoNotificaciones())
    } catch (e: unknown) {
      setErrorMail(obtenerMensajeErrorApi(e))
    } finally {
      setProbando(false)
    }
  }

  function set<K extends keyof ConfiguracionSede>(campo: K, valor: ConfiguracionSede[K]) {
    setFormulario((f) => ({ ...f, [campo]: valor }))
  }

  async function guardar() {
    setGuardando(true)
    setError(null)
    try {
      await configuracionSedeApi.update({ ...formulario, telefono: formulario.whatsapp })
      await refrescar()
      avisoExito('Configuración guardada')
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    } finally {
      setGuardando(false)
    }
  }

  async function guardarHorario() {
    if (lugarId == null) return
    setGuardandoHorario(true)
    setErrorHorario(null)
    try {
      await horariosCanchaApi.guardarSucursal(lugarId, horario)
      avisoExito('Horario guardado para todas las canchas de la sede')
    } catch (e: unknown) {
      setErrorHorario(obtenerMensajeErrorApi(e))
    } finally {
      setGuardandoHorario(false)
    }
  }

  async function subirImagen(file: File) {
    setSubiendo(true)
    setError(null)
    try {
      const url = await configuracionSedeApi.subirImagenGaleria(file)
      set('galeria', [...formulario.galeria, { url, alt: '' }])
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    } finally {
      setSubiendo(false)
      if (inputArchivo.current) inputArchivo.current.value = ''
    }
  }

  // El horario tiene su propio botón porque se guarda contra otro endpoint: un único
  // "Guardar" que a veces graba una cosa y a veces dos se presta a perder cambios.
  const botonGuardar = seccion === 'turnos'
    ? <Button size="sm" onClick={guardarHorario} disabled={guardandoHorario}>{guardandoHorario ? 'Guardando...' : 'Guardar horario'}</Button>
    : <Button size="sm" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar cambios'}</Button>

  return (
    <section>
      <AdminPageHeader title="Configuración" action={botonGuardar} />

      <div className="mt-4">
        <SegmentedToggle valor={seccion} onChange={setSeccion} opciones={SECCIONES} />
      </div>

      {seccion === 'club' && (
        <>
          <Seccion titulo="Contacto">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Email" value={formulario.email ?? ''} onChange={(e) => set('email', e.target.value)} />
              <Input label="WhatsApp / Teléfono (solo números, con código de país)" value={formulario.whatsapp ?? ''} onChange={(e) => set('whatsapp', e.target.value)} placeholder="5493856894061" />
              <Input label="Dirección" value={formulario.direccion ?? ''} onChange={(e) => set('direccion', e.target.value)} />
              <Input label="Instagram (URL)" value={formulario.instagram ?? ''} onChange={(e) => set('instagram', e.target.value)} />
              <Input label="Facebook (URL)" value={formulario.facebook ?? ''} onChange={(e) => set('facebook', e.target.value)} />
              <div className="flex flex-col gap-1 sm:col-span-2">
                <Input label="Mapa (Google Maps)" value={formulario.mapsEmbedUrl ?? ''} onChange={(e) => set('mapsEmbedUrl', e.target.value)} placeholder="Pegá el link de Google Maps o la dirección" />
                <p className="text-xs text-rp-muted">Pegá la URL que te da Google Maps (botón "Compartir") o directamente la dirección. Nosotros armamos el mapa embebido automáticamente.</p>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <Input
                  label="Cancelación online (horas antes)"
                  soloNumeros
                  value={formulario.cancelacionHorasMinimas != null ? String(formulario.cancelacionHorasMinimas) : ''}
                  onChange={(e) => set('cancelacionHorasMinimas', e.target.value === '' ? null : Number(e.target.value))}
                  placeholder="12"
                />
                <p className="text-xs text-rp-muted">
                  Hasta cuántas horas antes el jugador puede cancelar su turno desde el enlace que le mandamos.
                  Con 0 se apaga y solo cancela el club. Cancelar libera la cancha para volver a venderla; la seña ya cobrada no se devuelve sola.
                </p>
              </div>
            </div>
          </Seccion>
          <Guardar onClick={guardar} guardando={guardando} />
        </>
      )}

      {seccion === 'turnos' && (
        <>
          <p className="mt-4 text-sm text-rp-muted">
            Esto es lo que define cómo se venden los turnos: a qué hora se puede jugar, cuánto dura
            cada uno y con cuánta anticipación se reserva. Se aplica a todas las canchas de la sede.
          </p>

          {lugares.length > 1 && (
            <div className="mt-4">
              <SegmentedToggle
                valor={String(lugarId ?? '')}
                onChange={(valor) => setLugarId(Number(valor))}
                opciones={lugares.map((lugar) => ({ valor: String(lugar.id), label: lugar.nombre }))}
              />
            </div>
          )}

          <Seccion titulo="Horario de atención">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Abre a las" type="time" value={horario.horaApertura} onChange={(e) => setHorario((h) => ({ ...h, horaApertura: e.target.value }))} />
              <Input label="Cierra a las" type="time" value={horario.horaCierre} onChange={(e) => setHorario((h) => ({ ...h, horaCierre: e.target.value }))} />
            </div>
            <p className="mt-2 text-xs leading-5 text-rp-muted">
              Si el cierre es menor que la apertura, la jornada cruza la medianoche: con 10:00 a
              02:00, los turnos de las 00 y la 1 son los últimos de esa noche y así aparecen,
              al final del día y no al principio.
            </p>

            <div className="mt-5">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-rp-muted">Días que abre</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {DIAS.map((dia) => {
                  const elegidos = listaDias(horario.diasActivos)
                  const activo = elegidos.includes(dia.valor)
                  return (
                    <button
                      key={dia.valor}
                      type="button"
                      aria-pressed={activo}
                      onClick={() => setHorario((h) => {
                        const actuales = listaDias(h.diasActivos)
                        const nuevos = activo ? actuales.filter((d) => d !== dia.valor) : [...actuales, dia.valor]
                        return { ...h, diasActivos: nuevos.sort().join(',') }
                      })}
                      className={activo
                        ? 'min-h-11 min-w-14 rounded-md border border-rp-accent bg-rp-accent px-3 text-sm font-black text-white'
                        : 'min-h-11 min-w-14 rounded-md border border-rp-border bg-rp-surface px-3 text-sm font-bold text-rp-text hover:border-rp-accent'}
                    >
                      {dia.nombre}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-5">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-rp-muted">Duraciones que vendés</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {DURACIONES.map((minutos) => {
                  const activa = listaDuraciones(horario.duracionesOfrecidas).includes(minutos)
                  return (
                    <button
                      key={minutos}
                      type="button"
                      aria-pressed={activa}
                      onClick={() => setHorario((h) => {
                        const actuales = listaDuraciones(h.duracionesOfrecidas)
                        const nuevas = activa
                          ? actuales.filter((m) => m !== minutos)
                          : [...actuales, minutos].sort((a, b) => a - b)
                        return { ...h, duracionesOfrecidas: nuevas.join(',') }
                      })}
                      className={activa
                        ? 'min-h-11 flex-1 rounded-md border border-rp-accent bg-rp-accent px-4 text-sm font-black text-white'
                        : 'min-h-11 flex-1 rounded-md border border-rp-border bg-rp-surface px-4 text-sm font-bold text-rp-text hover:border-rp-accent'}
                    >
                      {etiquetaDuracion(minutos)}
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-xs leading-5 text-rp-muted">
                Sumar una duración agrega una opción de venta, no horarios nuevos: los turnos
                arrancan siempre en hora en punto. Un turno de hora y media que empieza a las 20
                termina 21:30 y el siguiente se vende a las 22.
              </p>
            </div>

            <div className="mt-5">
              <Input
                label="Con cuántos días de anticipación se puede reservar"
                inputMode="numeric"
                value={String(horario.anticipacionDias ?? 14)}
                onChange={(e) => setHorario((h) => ({ ...h, anticipacionDias: Number(e.target.value.replace(/\D/g, '')) || 0 }))}
              />
              <p className="mt-1 text-xs text-rp-muted">Ej: 14 = los jugadores pueden reservar hasta dos semanas antes.</p>
            </div>

            {errorHorario && <p className="mt-4 rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorHorario}</p>}
          </Seccion>

          <div className="mt-5">
            <Button onClick={guardarHorario} disabled={guardandoHorario}>{guardandoHorario ? 'Guardando...' : 'Guardar horario'}</Button>
          </div>

          <p className="mt-4 text-xs leading-5 text-rp-muted">
            El precio por hora y la seña se cargan en <b className="text-rp-text">Sedes y canchas</b>, porque
            pueden ser distintos en cada cancha. Las promociones se cargan desde Turnos.
          </p>
        </>
      )}

      {seccion === 'publico' && (
        <>
          <p className="mt-4 text-sm text-rp-muted">Lo que ven los jugadores en la web del club.</p>

          <Lista
            titulo="Horarios de atención (texto que se publica)"
            items={formulario.horarios}
            onChange={(items) => set('horarios', items)}
            vacio={{ dias: '', horas: '' }}
            render={(item, actualizar) => (
              <>
                <Input label="Días" value={item.dias} onChange={(e) => actualizar({ ...item, dias: e.target.value })} />
                <Input label="Horario" value={item.horas} onChange={(e) => actualizar({ ...item, horas: e.target.value })} />
              </>
            )}
          />

          <Lista
            titulo="Formas de pago"
            items={formulario.formasPago.map((texto) => ({ texto }))}
            onChange={(items) => set('formasPago', items.map((item) => item.texto))}
            vacio={{ texto: '' }}
            render={(item, actualizar) => (
              <Input label="Forma de pago" value={item.texto} onChange={(e) => actualizar({ texto: e.target.value })} />
            )}
          />

          <Seccion titulo="Galería">
            <p className="text-xs text-rp-muted">Imágenes que se muestran en la página "La sede". JPG o PNG, hasta 2 MB.</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {formulario.galeria.map((foto, i) => (
                <div key={i} className="overflow-hidden rounded-lg border border-rp-border bg-rp-bg/55">
                  <div className="relative aspect-square">
                    <img src={resolveSedeAsset(foto.url) ?? foto.url} alt={foto.alt} className="size-full object-cover" />
                    <button type="button" onClick={() => set('galeria', formulario.galeria.filter((_, j) => j !== i))} className="absolute right-1.5 top-1.5 flex size-9 items-center justify-center rounded-md bg-black/60 text-white hover:bg-rp-danger" aria-label="Quitar imagen"><X size={16} /></button>
                  </div>
                  <div className="p-2">
                    <Input placeholder="Descripción (alt)" value={foto.alt} onChange={(e) => set('galeria', formulario.galeria.map((actual, j) => j === i ? { ...actual, alt: e.target.value } : actual))} />
                  </div>
                </div>
              ))}
            </div>
            <input ref={inputArchivo} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => { const archivo = e.target.files?.[0]; if (archivo) void subirImagen(archivo) }} />
            <Button variant="ghost" size="sm" onClick={() => inputArchivo.current?.click()} disabled={subiendo} className="mt-4"><Upload size={15} />{subiendo ? 'Subiendo...' : 'Subir imagen'}</Button>
          </Seccion>

          <SponsorsSection />
          <Guardar onClick={guardar} guardando={guardando} />
        </>
      )}

      {seccion === 'cobros' && (
        <>
          <Seccion titulo="Pagos (Mercado Pago)">
            <p className="text-xs text-rp-muted">
              Access Token de Mercado Pago para cobrar señas de turnos e inscripciones.
              {formulario.mercadoPagoConfigurado
                ? ' Ya hay un token configurado. Dejá el campo vacío para mantenerlo, o pegá uno nuevo para reemplazarlo.'
                : ' Todavía no hay token configurado: los pagos online no funcionan hasta cargarlo.'}
            </p>
            <Input
              label="Access Token"
              type="password"
              autoComplete="off"
              value={formulario.mercadoPagoAccessToken ?? ''}
              onChange={(e) => set('mercadoPagoAccessToken', e.target.value || null)}
              placeholder={formulario.mercadoPagoConfigurado ? '•••••••• (configurado)' : 'APP_USR-...'}
              className="mt-3"
            />
            <p className="mt-2 rounded-md border border-rp-accent/40 bg-rp-accent/10 px-3 py-2 text-xs font-bold text-rp-muted">
              Dato sensible: una vez guardado no se vuelve a mostrar. El sistema solo indica si está cargado.
            </p>
          </Seccion>

          <Seccion titulo="Avisos por mail">
            <p className="text-sm text-rp-muted">
              El sistema te manda un mail al <b className="text-rp-text">Email</b> que cargaste en
              "El club", en estas cuatro situaciones y en ninguna otra:
            </p>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-rp-muted">
              <li>· Alguien pidió un turno desde la web.</li>
              <li>· Alguien se inscribió a un torneo.</li>
              <li>· Un turno fijo no se pudo agendar porque el horario ya estaba ocupado.</li>
              <li>· Se cobró una seña por un turno que ya no estaba disponible (hay que devolverla).</li>
            </ul>
            <p className="mt-2 text-xs text-rp-muted">
              Al cliente no se le manda ningún mail: la confirmación del turno la hacés vos por WhatsApp.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {notificaciones == null ? (
                <span className="text-sm text-rp-muted">Verificando...</span>
              ) : notificaciones.activo ? (
                <span className="rounded-full bg-rp-accent/15 px-3 py-1 text-xs font-bold text-rp-accent">
                  Activo · los avisos llegan a {notificaciones.destino}
                </span>
              ) : notificaciones.servidorConfigurado ? (
                <span className="rounded-full bg-rp-danger/15 px-3 py-1 text-xs font-bold text-rp-danger">
                  Falta cargar el email del club, en "El club"
                </span>
              ) : (
                <span className="rounded-full bg-rp-danger/15 px-3 py-1 text-xs font-bold text-rp-danger">
                  Los avisos por mail todavía no están activados
                </span>
              )}
              <Button variant="subtle" size="sm" onClick={probarMail} disabled={probando}>
                {probando ? 'Enviando...' : 'Enviar mail de prueba'}
              </Button>
            </div>

            {notificaciones && !notificaciones.servidorConfigurado && (
              <p className="mt-3 text-xs leading-5 text-rp-muted">
                Para que el sistema pueda <i>enviar</i> mails hace falta conectarle una casilla de correo.
                Es una configuración técnica que se hace una sola vez al instalar el sistema y no se
                carga desde acá (la contraseña de la casilla nunca se guarda en la base de datos).
                Mientras no esté, el club sigue funcionando igual: los turnos y las inscripciones
                aparecen en el panel, pero no te llega el aviso al mail.
                Pedísela a quien administra el sistema.
              </p>
            )}
            {errorMail && <p className="mt-3 rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorMail}</p>}
          </Seccion>

          <Guardar onClick={guardar} guardando={guardando} />
        </>
      )}

      {error && <p className="mt-4 rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{error}</p>}
    </section>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="mt-5 rounded-lg border border-rp-border bg-rp-surface/82 p-5">
      <legend className="px-1 text-xs font-black uppercase tracking-[0.14em] text-rp-accent">{titulo}</legend>
      <div className="mt-3">{children}</div>
    </fieldset>
  )
}

function Guardar({ onClick, guardando }: { onClick: () => void; guardando: boolean }) {
  return (
    <div className="mt-5">
      <Button onClick={onClick} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar cambios'}</Button>
    </div>
  )
}

function Lista<T>({ titulo, items, onChange, vacio, render }: {
  titulo: string
  items: T[]
  onChange: (items: T[]) => void
  vacio: T
  render: (item: T, actualizar: (nuevo: T) => void) => React.ReactNode
}) {
  return (
    <Seccion titulo={titulo}>
      <div className="flex flex-col gap-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-end gap-3 rounded-lg border border-rp-border bg-rp-bg/55 p-3">
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              {render(item, (nuevo) => onChange(items.map((actual, j) => j === i ? nuevo : actual)))}
            </div>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="mb-0.5 flex size-11 shrink-0 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger" aria-label="Quitar"><Minus size={16} /></button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={() => onChange([...items, vacio])} className="self-start"><Plus size={15} />Agregar</Button>
      </div>
    </Seccion>
  )
}
