import { ArrowLeft, Check, TriangleAlert, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'

import { inscripcionesApi, type AprobarInscripcionRequest, type JugadorCandidato, type SolicitudInscripcionResponse } from '@/features/inscripciones/inscripcionesApi'
import { tournamentsApi } from '@/features/tournaments/tournamentsApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { ordenarCategorias } from '@/shared/lib/categorias'
import type { CategoriaResponse } from '@/shared/types/api'
import { AdminTable, type Column } from '@/shared/ui/AdminTable'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { Select } from '@/shared/ui/Select'
import { useToast } from '@/shared/ui/Toast'

type SeleccionIntegrante = number | 'nuevo' | null

function integranteNecesitaResolucion(esNuevo: boolean, candidatos: JugadorCandidato[]) {
  return esNuevo && candidatos.length > 0
}

function solicitudNecesitaResolucion(s: SolicitudInscripcionResponse) {
  return integranteNecesitaResolucion(s.jugador1EsNuevo, s.jugador1Candidatos)
    || integranteNecesitaResolucion(s.jugador2EsNuevo, s.jugador2Candidatos)
}

function ResolverIntegrante({ titulo, nombre, candidatos, seleccion, onSeleccionar }: {
  titulo: string
  nombre: string
  candidatos: JugadorCandidato[]
  seleccion: SeleccionIntegrante
  onSeleccionar: (valor: SeleccionIntegrante) => void
}) {
  return (
    <div className="rounded-md border border-rp-border p-3">
      <p className="text-xs font-black uppercase tracking-wide text-rp-accent">{titulo}</p>
      <p className="mt-1 text-sm text-rp-text">Se cargó como nuevo: <strong>{nombre}</strong></p>
      <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-rp-muted">
        <TriangleAlert size={13} className="text-rp-accent" />
        Ya existe alguien con ese nombre. Elegí si es uno de estos o un jugador realmente nuevo.
      </p>
      <div className="mt-2 flex flex-col gap-1.5">
        {candidatos.map((candidato) => (
          <button
            key={candidato.id}
            onClick={() => onSeleccionar(candidato.id)}
            className={
              seleccion === candidato.id
                ? 'flex items-center justify-between rounded-md border border-rp-accent bg-rp-accent/10 px-3 py-2 text-left'
                : 'flex items-center justify-between rounded-md border border-rp-border px-3 py-2 text-left hover:border-rp-accent'
            }
          >
            <span className="text-sm font-bold text-rp-text">Vincular a {candidato.nombre} {candidato.apellido}</span>
            {candidato.categoriaNombre && <span className="text-xs text-rp-muted">{candidato.categoriaNombre}</span>}
          </button>
        ))}
        <button
          onClick={() => onSeleccionar('nuevo')}
          className={
            seleccion === 'nuevo'
              ? 'rounded-md border border-rp-accent bg-rp-accent/10 px-3 py-2 text-left text-sm font-bold text-rp-text'
              : 'rounded-md border border-rp-border px-3 py-2 text-left text-sm font-bold text-rp-text hover:border-rp-accent'
          }
        >
          Crear como jugador nuevo (empieza en 0 puntos)
        </button>
      </div>
    </div>
  )
}

export default function InscripcionesAdminPage() {
  const { torneoId } = useParams<{ torneoId: string }>()
  const idTorneo = useMemo(() => (torneoId ? Number(torneoId) : null), [torneoId])
  const [solicitudes, setSolicitudes] = useState<SolicitudInscripcionResponse[]>([])
  const [categorias, setCategorias] = useState<CategoriaResponse[]>([])
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { success: avisoExito } = useToast()

  const [solicitudAResolver, setSolicitudAResolver] = useState<SolicitudInscripcionResponse | null>(null)
  const [seleccion1, setSeleccion1] = useState<SeleccionIntegrante>(null)
  const [seleccion2, setSeleccion2] = useState<SeleccionIntegrante>(null)
  const [aprobando, setAprobando] = useState(false)

  function cargar() {
    if (idTorneo == null) return
    setCargando(true)
    inscripcionesApi.listar(idTorneo)
      .then((datos) => { setSolicitudes(datos); setError(null) })
      .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
      .finally(() => setCargando(false))
  }
  useEffect(cargar, [idTorneo])

  useEffect(() => {
    if (idTorneo == null) return
    tournamentsApi.getById(idTorneo)
      .then((torneo) => setCategorias(torneo.categorias))
      .catch(() => setCategorias([]))
  }, [idTorneo])

  const solicitudesFiltradas = useMemo(
    () => (filtroCategoria ? solicitudes.filter((s) => String(s.categoriaId) === filtroCategoria) : solicitudes),
    [solicitudes, filtroCategoria],
  )

  async function ejecutar(accion: () => Promise<unknown>, mensaje: string) {
    try {
      await accion()
      avisoExito(mensaje)
      cargar()
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    }
  }

  function iniciarAprobacion(s: SolicitudInscripcionResponse) {
    if (solicitudNecesitaResolucion(s)) {
      setSolicitudAResolver(s)
      setSeleccion1(null)
      setSeleccion2(null)
      return
    }
    ejecutar(() => inscripcionesApi.aprobar(s.id), 'Inscripción aprobada')
  }

  const resolucion1Pendiente = solicitudAResolver != null
    && integranteNecesitaResolucion(solicitudAResolver.jugador1EsNuevo, solicitudAResolver.jugador1Candidatos)
    && seleccion1 == null
  const resolucion2Pendiente = solicitudAResolver != null
    && integranteNecesitaResolucion(solicitudAResolver.jugador2EsNuevo, solicitudAResolver.jugador2Candidatos)
    && seleccion2 == null
  const puedeConfirmar = solicitudAResolver != null && !resolucion1Pendiente && !resolucion2Pendiente

  async function confirmarAprobacion() {
    if (solicitudAResolver == null) return
    const seleccion: AprobarInscripcionRequest = {
      jugador1Id: typeof seleccion1 === 'number' ? seleccion1 : undefined,
      jugador2Id: typeof seleccion2 === 'number' ? seleccion2 : undefined,
    }
    setAprobando(true)
    try {
      await inscripcionesApi.aprobar(solicitudAResolver.id, seleccion)
      avisoExito('Inscripción aprobada')
      setSolicitudAResolver(null)
      cargar()
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    } finally {
      setAprobando(false)
    }
  }

  const columnas = useMemo(() => [
    { key: 'pareja', label: 'Pareja', render: (s: SolicitudInscripcionResponse) => <span className="text-sm font-bold text-rp-text">{s.jugador1} / {s.jugador2}</span> },
    { key: 'categoria', label: 'Categoría', render: (s: SolicitudInscripcionResponse) => <span className="text-sm text-rp-muted">{s.categoriaNombre}</span> },
    { key: 'contacto', label: 'Contacto', render: (s: SolicitudInscripcionResponse) => <span className="text-xs text-rp-muted">{s.telefonoContacto ?? '-'}</span> },
    {
      key: 'estado',
      label: 'Estado',
      render: (s: SolicitudInscripcionResponse) => (
        <span className="flex items-center gap-1.5">
          <span className="text-xs font-black uppercase tracking-wide text-rp-accent">{s.estado}</span>
          {s.estado === 'PENDIENTE' && solicitudNecesitaResolucion(s) && (
            <span className="flex items-center gap-1 rounded-full bg-rp-accent/15 px-2 py-0.5 text-[10px] font-bold text-rp-accent">
              <TriangleAlert size={11} /> posible duplicado
            </span>
          )}
        </span>
      ),
    },
  ] as Column<SolicitudInscripcionResponse>[], [])

  return (
    <section>
      <Button variant="ghost" size="sm" asChild>
        <NavLink to={`/admin/torneos/${idTorneo}`}><ArrowLeft size={16} />Volver a la gestión del torneo</NavLink>
      </Button>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.22em] text-rp-accent">Admin</p>
      <h1 className="mt-2 text-2xl font-black text-rp-text sm:text-3xl">Inscripciones del torneo</h1>
      <p className="mt-1 text-sm text-rp-muted">Aprobá o rechazá las solicitudes. Si alguien se cargó como nuevo pero ya existe un jugador con ese nombre, vas a tener que resolver el duplicado antes de aprobar.</p>

      <div className="mt-4 w-full sm:w-64">
        <Select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} placeholder="Todas las categorías">
          {ordenarCategorias(categorias).map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}
        </Select>
      </div>

      <div className="mt-4">
        <AdminTable
          columns={columnas}
          rows={solicitudesFiltradas}
          getRowKey={(s) => s.id}
          isLoading={cargando}
          error={error}
          emptyTitle="No hay solicitudes de inscripción"
          actions={(s) => (
            s.estado === 'PENDIENTE' ? (
              <>
                <button onClick={() => iniciarAprobacion(s)} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-accent" aria-label="Aprobar"><Check size={15} /></button>
                <button onClick={() => ejecutar(() => inscripcionesApi.rechazar(s.id), 'Inscripción rechazada')} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-danger" aria-label="Rechazar"><X size={15} /></button>
              </>
            ) : null
          )}
        />
      </div>

      <Modal isOpen={solicitudAResolver != null} onClose={() => setSolicitudAResolver(null)} title="Revisar posibles duplicados" size="md">
        {solicitudAResolver && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-rp-muted">
              Antes de aprobar a <strong>{solicitudAResolver.jugador1} / {solicitudAResolver.jugador2}</strong> resolvé cada coincidencia para no crear un jugador repetido.
            </p>

            {integranteNecesitaResolucion(solicitudAResolver.jugador1EsNuevo, solicitudAResolver.jugador1Candidatos) && (
              <ResolverIntegrante titulo="Jugador 1" nombre={solicitudAResolver.jugador1} candidatos={solicitudAResolver.jugador1Candidatos} seleccion={seleccion1} onSeleccionar={setSeleccion1} />
            )}
            {integranteNecesitaResolucion(solicitudAResolver.jugador2EsNuevo, solicitudAResolver.jugador2Candidatos) && (
              <ResolverIntegrante titulo="Jugador 2" nombre={solicitudAResolver.jugador2} candidatos={solicitudAResolver.jugador2Candidatos} seleccion={seleccion2} onSeleccionar={setSeleccion2} />
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setSolicitudAResolver(null)} disabled={aprobando}>Cancelar</Button>
              <Button size="sm" onClick={confirmarAprobacion} disabled={!puedeConfirmar || aprobando}>{aprobando ? 'Aprobando...' : 'Aprobar inscripción'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  )
}
