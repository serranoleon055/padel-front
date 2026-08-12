import { Plus, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { configuracionSedeApi } from '@/features/configuracion/configuracionApi'
import { sponsorsApi, type SponsorResponse } from '@/features/sponsors/sponsorsApi'
import { resolveSedeAsset } from '@/shared/api/apiClient'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { useToast } from '@/shared/ui/Toast'

const VACIO = { nombre: '', logoUrl: '', enlace: '', orden: 0 }

/**
 * Auspiciantes del club. Vive dentro de Configuración de sede porque es parte de cómo se
 * muestra el club hacia afuera, junto con la galería y los datos de contacto.
 *
 * <p>El logo se sube por el mismo camino que las fotos de la galería: no hace falta otra
 * plomería de imágenes para esto.
 */
export function SponsorsSection() {
  const [sponsors, setSponsors] = useState<SponsorResponse[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [abierto, setAbierto] = useState(false)
  const [edicion, setEdicion] = useState<SponsorResponse | null>(null)
  const [form, setForm] = useState({ ...VACIO })
  const [subiendo, setSubiendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [aBorrar, setABorrar] = useState<SponsorResponse | null>(null)
  const inputArchivo = useRef<HTMLInputElement>(null)
  const { success: avisoExito } = useToast()

  function cargar() {
    setCargando(true)
    sponsorsApi.todos()
      .then((datos) => { setSponsors(datos); setError(null) })
      .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
      .finally(() => setCargando(false))
  }
  useEffect(cargar, [])

  function abrirNuevo() {
    setEdicion(null)
    // El orden por defecto lo manda al final, que es donde el club espera que aparezca
    // uno nuevo hasta que decida subirlo.
    setForm({ ...VACIO, orden: sponsors.length })
    setErrorForm(null)
    setAbierto(true)
  }

  function abrirEditar(sponsor: SponsorResponse) {
    setEdicion(sponsor)
    setForm({
      nombre: sponsor.nombre,
      logoUrl: sponsor.logoUrl,
      enlace: sponsor.enlace ?? '',
      orden: sponsor.orden,
    })
    setErrorForm(null)
    setAbierto(true)
  }

  async function subirLogo(file: File) {
    setSubiendo(true)
    setErrorForm(null)
    try {
      const url = await configuracionSedeApi.subirImagenGaleria(file)
      setForm((actual) => ({ ...actual, logoUrl: url }))
    } catch (e: unknown) {
      setErrorForm(obtenerMensajeErrorApi(e))
    } finally {
      setSubiendo(false)
    }
  }

  async function guardar() {
    if (!form.nombre.trim()) { setErrorForm('Poné el nombre del sponsor'); return }
    if (!form.logoUrl) { setErrorForm('Subí el logo'); return }
    setGuardando(true)
    setErrorForm(null)
    try {
      const cuerpo = {
        nombre: form.nombre.trim(),
        logoUrl: form.logoUrl,
        enlace: form.enlace.trim() || null,
        lugarId: null,
        orden: form.orden,
      }
      if (edicion) await sponsorsApi.update(edicion.id, cuerpo)
      else await sponsorsApi.create(cuerpo)
      setAbierto(false)
      cargar()
      avisoExito(edicion ? 'Sponsor actualizado' : 'Sponsor agregado')
    } catch (e: unknown) {
      setErrorForm(obtenerMensajeErrorApi(e))
    } finally {
      setGuardando(false)
    }
  }

  async function borrar() {
    if (!aBorrar) return
    try {
      await sponsorsApi.remove(aBorrar.id)
      setABorrar(null)
      cargar()
      avisoExito('Sponsor eliminado')
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e)); setABorrar(null)
    }
  }

  return (
    <fieldset className="mt-5 rounded-lg border border-rp-border bg-rp-surface/82 p-5">
      <legend className="px-1 text-xs font-black uppercase tracking-[0.14em] text-rp-accent">Auspiciantes</legend>
      <p className="mt-2 text-xs text-rp-muted">
        Los logos aparecen al pie de todas las páginas públicas: inicio, turnos, torneos y ranking.
        Es el espacio que le podés vender a un comercio.
      </p>

      {error && <p className="mt-3 rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{error}</p>}
      {cargando ? (
        <p className="mt-4 text-sm text-rp-muted">Cargando...</p>
      ) : sponsors.length === 0 ? (
        <p className="mt-4 text-sm text-rp-muted">Todavía no cargaste ninguno.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {sponsors.map((sponsor) => (
            <li key={sponsor.id} className="flex items-center gap-3 rounded-md border border-rp-border bg-rp-bg/55 px-3 py-2">
              <img src={resolveSedeAsset(sponsor.logoUrl) ?? sponsor.logoUrl} alt={sponsor.nombre} className="h-8 w-16 object-contain" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-rp-text">{sponsor.nombre}</p>
                <p className="truncate text-xs text-rp-muted">{sponsor.enlace ?? 'Sin enlace'}</p>
              </div>
              <span className="text-xs font-bold text-rp-muted">#{sponsor.orden}</span>
              <button type="button" onClick={() => abrirEditar(sponsor)} className="text-xs font-bold text-rp-muted underline hover:text-rp-accent">Editar</button>
              <button type="button" onClick={() => setABorrar(sponsor)} className="flex size-11 items-center justify-center rounded-md lg:size-8 text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger" aria-label="Eliminar"><Trash2 size={15} /></button>
            </li>
          ))}
        </ul>
      )}

      <Button variant="ghost" size="sm" onClick={abrirNuevo} className="mt-4"><Plus size={15} />Agregar sponsor</Button>

      <Modal isOpen={abierto} onClose={() => setAbierto(false)} title={edicion ? 'Editar sponsor' : 'Nuevo sponsor'} size="sm">
        <div className="flex flex-col gap-4">
          <Input label="Nombre" value={form.nombre} onChange={(e) => setForm((a) => ({ ...a, nombre: e.target.value }))} placeholder="Cervecería del Centro" />
          <Input label="Enlace (opcional)" value={form.enlace} onChange={(e) => setForm((a) => ({ ...a, enlace: e.target.value }))} placeholder="instagram.com/cerveceria" />
          <Input label="Orden" value={String(form.orden)} onChange={(e) => setForm((a) => ({ ...a, orden: Number(e.target.value.replace(/\D/g, '')) || 0 }))} inputMode="numeric" />
          <div>
            <span className="text-xs font-black uppercase tracking-[0.14em] text-rp-muted">Logo</span>
            {form.logoUrl ? (
              <div className="relative mt-2 inline-block rounded-md border border-rp-border bg-rp-bg/55 p-2">
                <img src={resolveSedeAsset(form.logoUrl) ?? form.logoUrl} alt="Logo del sponsor" className="h-14 w-auto max-w-[180px] object-contain" />
                <button type="button" onClick={() => setForm((a) => ({ ...a, logoUrl: '' }))} className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-md bg-black/70 text-white hover:bg-rp-danger" aria-label="Quitar logo"><X size={13} /></button>
              </div>
            ) : (
              <p className="mt-1 text-xs text-rp-muted">JPG o PNG, hasta 2 MB. Se ve mejor con fondo transparente.</p>
            )}
            <input ref={inputArchivo} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => { const archivo = e.target.files?.[0]; if (archivo) void subirLogo(archivo) }} />
            <Button variant="ghost" size="sm" onClick={() => inputArchivo.current?.click()} disabled={subiendo} className="mt-2">
              <Upload size={15} />{subiendo ? 'Subiendo...' : form.logoUrl ? 'Cambiar logo' : 'Subir logo'}
            </Button>
          </div>
          {errorForm && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{errorForm}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setAbierto(false)} disabled={guardando}>Cancelar</Button>
            <Button size="sm" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(aBorrar)}
        onClose={() => setABorrar(null)}
        onConfirm={borrar}
        title="Eliminar sponsor"
        description={aBorrar ? `Se saca "${aBorrar.nombre}" de las páginas públicas.` : ''}
      />
    </fieldset>
  )
}
