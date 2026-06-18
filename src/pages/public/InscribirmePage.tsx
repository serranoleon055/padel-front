import { useEffect, useMemo, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'

import { tournamentsApi } from '@/features/tournaments/tournamentsApi'
import { inscripcionesApi, type IntegranteInscripcion, type JugadorBusqueda } from '@/features/inscripciones/inscripcionesApi'
import { pagosApi } from '@/features/pagos/pagosApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { ordenarCategorias } from '@/shared/lib/categorias'
import { formatearMoneda } from '@/shared/lib/formatters'
import type { CategoriaResponse } from '@/shared/types/api'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { Select } from '@/shared/ui/Select'

function SelectorJugador({ titulo, valor, onChange, generoCategoria }: {
  titulo: string
  valor: IntegranteInscripcion
  onChange: (valor: IntegranteInscripcion) => void
  generoCategoria: 'MASCULINO' | 'FEMENINO' | null
}) {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<JugadorBusqueda[]>([])
  const [seleccionNombre, setSeleccionNombre] = useState<string | null>(null)
  const [modoNuevo, setModoNuevo] = useState(false)

  useEffect(() => {
    if (valor.jugadorId || modoNuevo) return
    const q = query.trim()
    if (q.length < 2) {
      setResultados([])
      return
    }
    let activo = true
    const temporizador = setTimeout(() => {
      inscripcionesApi.buscarJugadores(q)
        .then((datos) => {
          if (!activo) return
          setResultados(generoCategoria ? datos.filter((j) => j.genero === generoCategoria) : datos)
        })
        .catch(() => { if (activo) setResultados([]) })
    }, 300)
    return () => { activo = false; clearTimeout(temporizador) }
  }, [query, valor.jugadorId, modoNuevo, generoCategoria])

  function elegirExistente(jugador: JugadorBusqueda) {
    setSeleccionNombre(`${jugador.nombre} ${jugador.apellido}`)
    setResultados([])
    setQuery('')
    onChange({ jugadorId: jugador.id })
  }

  function limpiar() {
    setSeleccionNombre(null)
    setModoNuevo(false)
    onChange({})
  }

  if (valor.jugadorId && seleccionNombre) {
    return (
      <div className="rounded-md border border-rp-accent/40 bg-rp-accent/10 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-rp-accent">{titulo}</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-sm font-bold text-rp-text">{seleccionNombre}</span>
          <button onClick={limpiar} className="text-xs font-bold text-rp-muted underline">cambiar</button>
        </div>
      </div>
    )
  }

  if (modoNuevo) {
    return (
      <div className="rounded-md border border-rp-border p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-wide text-rp-accent">{titulo} (nuevo)</p>
          <button onClick={() => setModoNuevo(false)} className="text-xs font-bold text-rp-muted underline">buscar existente</button>
        </div>
        <p className="mt-1 text-xs text-rp-muted">Género: {generoCategoria === 'FEMENINO' ? 'Femenino' : 'Masculino'} (según la categoría elegida)</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <Input label="Nombre" value={valor.nombre ?? ''} onChange={(e) => onChange({ ...valor, nombre: e.target.value, genero: generoCategoria ?? valor.genero })} placeholder="Juan" />
          <Input label="Apellido" value={valor.apellido ?? ''} onChange={(e) => onChange({ ...valor, apellido: e.target.value, genero: generoCategoria ?? valor.genero })} placeholder="Pérez" />
          <Input label="Fecha de nacimiento (opcional)" type="date" value={valor.fechaNacimiento ?? ''} onChange={(e) => onChange({ ...valor, fechaNacimiento: e.target.value })} />
          <Select label="Posición (opcional)" value={valor.posicionJuego ?? ''} onChange={(e) => onChange({ ...valor, posicionJuego: e.target.value || undefined })} placeholder="Sin definir">
            <option value="DRIVE">Drive</option>
            <option value="REVES">Revés</option>
          </Select>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-rp-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-wide text-rp-accent">{titulo}</p>
        <button onClick={() => { setModoNuevo(true); setResultados([]) }} className="text-xs font-bold text-rp-muted underline">no está en la lista</button>
      </div>
      <div className="mt-2">
        <Input placeholder="Buscá por nombre o apellido..." value={query} onChange={(e) => setQuery(e.target.value)} />
        {resultados.length > 0 && (
          <ul className="mt-1 max-h-44 overflow-y-auto rounded-md border border-rp-border bg-rp-surface">
            {resultados.map((jugador) => (
              <li key={jugador.id}>
                <button onClick={() => elegirExistente(jugador)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-rp-surface-2">
                  <span className="font-semibold text-rp-text">{jugador.nombre} {jugador.apellido}</span>
                  {jugador.categoriaNombre && <span className="text-xs text-rp-muted">{jugador.categoriaNombre}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default function InscribirmePage() {
  const { torneoId } = useParams<{ torneoId: string }>()
  const idTorneo = useMemo(() => (torneoId ? Number(torneoId) : null), [torneoId])

  const [nombreTorneo, setNombreTorneo] = useState('')
  const [categorias, setCategorias] = useState<CategoriaResponse[]>([])
  const [costoInscripcion, setCostoInscripcion] = useState<number | null>(null)
  const [porcentajeSenia, setPorcentajeSenia] = useState(50)
  const [categoriaId, setCategoriaId] = useState<number | null>(null)
  const [jugador1, setJugador1] = useState<IntegranteInscripcion>({})
  const [jugador2, setJugador2] = useState<IntegranteInscripcion>({})
  const [telefono, setTelefono] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState(false)

  useEffect(() => {
    if (idTorneo == null) return
    tournamentsApi.getById(idTorneo)
      .then((torneo) => {
        setNombreTorneo(torneo.nombre)
        setCategorias(torneo.categorias)
        setCostoInscripcion(torneo.costoInscripcionJugador ?? null)
        setPorcentajeSenia(torneo.seniaPorcentaje && torneo.seniaPorcentaje > 0 ? torneo.seniaPorcentaje : 50)
      })
      .catch((e: unknown) => setError(obtenerMensajeErrorApi(e)))
  }, [idTorneo])

  const categoriasOrdenadas = useMemo(() => ordenarCategorias(categorias), [categorias])
  const generoCategoria = useMemo<'MASCULINO' | 'FEMENINO' | null>(() => {
    const elegida = categorias.find((c) => c.id === categoriaId)
    return elegida ? (elegida.genero as 'MASCULINO' | 'FEMENINO') : null
  }, [categorias, categoriaId])

  function elegirCategoria(nuevoId: number | null) {
    setCategoriaId(nuevoId)
    setJugador1({})
    setJugador2({})
  }

  function integranteCompleto(integrante: IntegranteInscripcion) {
    if (integrante.jugadorId) return true
    return Boolean(integrante.nombre?.trim() && integrante.apellido?.trim() && integrante.genero)
  }

  const totalPareja = costoInscripcion != null ? costoInscripcion * 2 : null
  const montoSenia = totalPareja != null ? Math.round((totalPareja * porcentajeSenia) / 100) : null

  function formularioValido() {
    if (idTorneo == null || categoriaId == null) {
      setError('Elegí una categoría.')
      return false
    }
    if (!telefono.trim()) {
      setError('Dejá un teléfono de contacto para que el club coordine la confirmación.')
      return false
    }
    if (!integranteCompleto(jugador1) || !integranteCompleto(jugador2)) {
      setError('Completá los dos jugadores (elegí existentes o cargá los datos).')
      return false
    }
    return true
  }

  async function enviar() {
    if (!formularioValido() || idTorneo == null || categoriaId == null) return
    setEnviando(true)
    setError(null)
    try {
      await inscripcionesApi.crear(idTorneo, {
        categoriaId,
        telefonoContacto: telefono.trim() || undefined,
        jugador1,
        jugador2,
      })
      setExito(true)
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    } finally {
      setEnviando(false)
    }
  }

  async function pagarEInscribir() {
    if (!formularioValido() || idTorneo == null || categoriaId == null) return
    setEnviando(true)
    setError(null)
    try {
      const { initPoint } = await pagosApi.crearPagoInscripcion({
        torneoId: idTorneo,
        inscripcion: {
          categoriaId,
          telefonoContacto: telefono.trim() || undefined,
          jugador1,
          jugador2,
        },
      })
      window.location.href = initPoint
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
      setEnviando(false)
    }
  }

  if (exito) {
    return (
      <section className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-rp-accent/15 text-2xl">✓</div>
        <h1 className="mt-4 text-2xl font-black text-rp-text">¡Inscripción enviada!</h1>
        <p className="mt-2 text-sm text-rp-muted">
          Tu solicitud quedó <strong>pendiente</strong>. Alguien del club se va a poner en contacto con vos
          al teléfono que dejaste para coordinar la confirmación y el pago de la seña.
        </p>
        <p className="mt-1 text-xs text-rp-muted">Podés cerrar esta página. ¡Gracias y éxitos en el torneo!</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild><NavLink to={`/torneos/${torneoId}`}>Ver el torneo</NavLink></Button>
          <Button variant="ghost" asChild><NavLink to="/">Volver al inicio</NavLink></Button>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-rp-accent">{nombreTorneo || 'Torneo'}</p>
      <h1 className="mt-2 text-3xl font-black text-rp-text">Inscribirme</h1>
      <p className="mt-1 text-sm text-rp-muted">Elegí la categoría y los dos jugadores. Si ya jugaron antes, buscalos para no duplicarlos.</p>

      <div className="mt-6 flex flex-col gap-4">
        <Select label="Categoría" value={categoriaId ?? ''} onChange={(e) => elegirCategoria(e.target.value ? Number(e.target.value) : null)} placeholder="Elegí una categoría">
          {categoriasOrdenadas.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}
        </Select>

        {categoriaId == null ? (
          <p className="rounded-md border border-rp-border bg-rp-surface-2 px-3 py-2 text-sm text-rp-muted">Elegí primero la categoría para buscar a los jugadores.</p>
        ) : (
          <>
            <SelectorJugador titulo="Jugador 1" valor={jugador1} onChange={setJugador1} generoCategoria={generoCategoria} />
            <SelectorJugador titulo="Jugador 2 (compañero)" valor={jugador2} onChange={setJugador2} generoCategoria={generoCategoria} />
          </>
        )}

        <Input label="Teléfono de contacto" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="385..." />

        {montoSenia != null && (
          <div className="rounded-md border border-rp-accent/40 bg-rp-accent/10 px-3 py-2 text-sm">
            <p className="font-bold text-rp-text">{formatearMoneda(costoInscripcion)} por jugador · {formatearMoneda(totalPareja)} la pareja</p>
            <p className="text-rp-muted">Seña a pagar ahora: <strong className="text-rp-accent">{formatearMoneda(montoSenia)}</strong> ({porcentajeSenia}%). Asegura tu lugar.</p>
          </div>
        )}

        {error && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{error}</p>}

        {montoSenia != null ? (
          <div className="flex flex-col gap-2">
            <Button onClick={pagarEInscribir} disabled={enviando}>{enviando ? 'Redirigiendo...' : `Pagar seña e inscribirme (${formatearMoneda(montoSenia)})`}</Button>
            <Button variant="subtle" onClick={enviar} disabled={enviando}>{enviando ? 'Enviando...' : 'Inscribirme sin pagar'}</Button>
          </div>
        ) : (
          <Button onClick={enviar} disabled={enviando}>{enviando ? 'Enviando...' : 'Enviar inscripción'}</Button>
        )}
      </div>
    </section>
  )
}
