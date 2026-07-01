import { Minus, Plus, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useConfiguracionSede } from '@/app/providers/ConfiguracionSedeContext'
import { configuracionSedeApi } from '@/features/configuracion/configuracionApi'
import { resolveSedeAsset } from '@/shared/api/apiClient'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import type { ConfiguracionSede } from '@/shared/types/api'
import { AdminPageHeader } from '@/shared/ui/AdminPageHeader'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { useToast } from '@/shared/ui/Toast'

export default function ConfiguracionSedePage() {
  const { configuracion, refrescar } = useConfiguracionSede()
  const { success: avisoExito } = useToast()
  const [formulario, setFormulario] = useState<ConfiguracionSede>(configuracion)
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputArchivo = useRef<HTMLInputElement>(null)

  useEffect(() => { setFormulario(configuracion) }, [configuracion])

  function set<K extends keyof ConfiguracionSede>(campo: K, valor: ConfiguracionSede[K]) {
    setFormulario((f) => ({ ...f, [campo]: valor }))
  }

  async function guardar() {
    setGuardando(true)
    setError(null)
    try {
      const datos: ConfiguracionSede = {
        ...formulario,
        telefono: formulario.whatsapp,
      }
      await configuracionSedeApi.update(datos)
      await refrescar()
      avisoExito('Configuración guardada')
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    } finally {
      setGuardando(false)
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

  return (
    <section>
      <AdminPageHeader title="Configuración de la sede" action={<Button size="sm" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar cambios'}</Button>} />

      <fieldset className="mt-5 rounded-lg border border-rp-border bg-rp-surface/82 p-5">
        <legend className="px-1 text-xs font-black uppercase tracking-[0.14em] text-rp-accent">Contacto</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Input label="Email" value={formulario.email ?? ''} onChange={(e) => set('email', e.target.value)} />
          <Input label="WhatsApp / Teléfono (solo números, con código de país)" value={formulario.whatsapp ?? ''} onChange={(e) => set('whatsapp', e.target.value)} placeholder="5493856894061" />
          <Input label="Dirección" value={formulario.direccion ?? ''} onChange={(e) => set('direccion', e.target.value)} />
          <Input label="Instagram (URL)" value={formulario.instagram ?? ''} onChange={(e) => set('instagram', e.target.value)} />
          <Input label="Facebook (URL)" value={formulario.facebook ?? ''} onChange={(e) => set('facebook', e.target.value)} />
          <div className="flex flex-col gap-1 sm:col-span-2">
            <Input label="Mapa (Google Maps)" value={formulario.mapsEmbedUrl ?? ''} onChange={(e) => set('mapsEmbedUrl', e.target.value)} placeholder="Pegá el link de Google Maps o la dirección" />
            <p className="text-xs text-rp-muted">Pegá la URL que te da Google Maps (botón "Compartir") o directamente la dirección. Nosotros armamos el mapa embebido automáticamente.</p>
          </div>
        </div>
      </fieldset>

      <Lista
        titulo="Horarios de atención"
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

      <fieldset className="mt-5 rounded-lg border border-rp-border bg-rp-surface/82 p-5">
        <legend className="px-1 text-xs font-black uppercase tracking-[0.14em] text-rp-accent">Pagos (Mercado Pago)</legend>
        <p className="mt-2 text-xs text-rp-muted">
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
          🔒 Dato sensible. No se muestra una vez guardado; solo se indica si está configurado.
        </p>
      </fieldset>

      <fieldset className="mt-5 rounded-lg border border-rp-border bg-rp-surface/82 p-5">
        <legend className="px-1 text-xs font-black uppercase tracking-[0.14em] text-rp-accent">Galería</legend>
        <p className="mt-2 text-xs text-rp-muted">Imágenes que se muestran en la página "La sede". JPG o PNG, hasta 2 MB.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {formulario.galeria.map((foto, i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-rp-border bg-rp-bg/55">
              <div className="relative aspect-square">
                <img src={resolveSedeAsset(foto.url) ?? foto.url} alt={foto.alt} className="size-full object-cover" />
                <button type="button" onClick={() => set('galeria', formulario.galeria.filter((_, j) => j !== i))} className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-md bg-black/60 text-white hover:bg-rp-danger" aria-label="Quitar imagen"><X size={15} /></button>
              </div>
              <div className="p-2">
                <Input placeholder="Descripción (alt)" value={foto.alt} onChange={(e) => set('galeria', formulario.galeria.map((actual, j) => j === i ? { ...actual, alt: e.target.value } : actual))} />
              </div>
            </div>
          ))}
        </div>
        <input ref={inputArchivo} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => { const archivo = e.target.files?.[0]; if (archivo) void subirImagen(archivo) }} />
        <Button variant="ghost" size="sm" onClick={() => inputArchivo.current?.click()} disabled={subiendo} className="mt-4"><Upload size={15} />{subiendo ? 'Subiendo...' : 'Subir imagen'}</Button>
      </fieldset>

      {error && <p className="mt-4 rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{error}</p>}
      <div className="mt-5">
        <Button onClick={guardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar cambios'}</Button>
      </div>
    </section>
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
    <fieldset className="mt-5 rounded-lg border border-rp-border bg-rp-surface/82 p-5">
      <legend className="px-1 text-xs font-black uppercase tracking-[0.14em] text-rp-accent">{titulo}</legend>
      <div className="mt-3 flex flex-col gap-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-end gap-3 rounded-lg border border-rp-border bg-rp-bg/55 p-3">
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              {render(item, (nuevo) => onChange(items.map((actual, j) => j === i ? nuevo : actual)))}
            </div>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger"><Minus size={15} /></button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={() => onChange([...items, vacio])} className="self-start"><Plus size={15} />Agregar</Button>
      </div>
    </fieldset>
  )
}
