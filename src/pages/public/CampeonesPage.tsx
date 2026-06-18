import './HomePage.css'
import { ArrowLeft, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'

import { categoriesApi } from '@/features/catalog/catalogApi'
import { homeApi } from '@/features/home/homeApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { fechaCompacta } from '@/shared/lib/formatters'
import type { CampeonResponse, CategoriaResponse, Genero } from '@/shared/types/api'
import { Pagination } from '@/shared/ui/Pagination'
import { StatusMessage } from '@/shared/ui/StatusMessage'

const TAMANO_PAGINA = 10

function resultadoFinal(item: CampeonResponse) {
  if (item.marcadorFinal) return item.marcadorFinal
  return 'Campeón de liga'
}

export default function CampeonesPage() {
  const [categorias, setCategorias] = useState<CategoriaResponse[]>([])
  const [campeones, setCampeones] = useState<CampeonResponse[]>([])
  const [total, setTotal] = useState(0)
  const [genero, setGenero] = useState<Genero>('MASCULINO')
  const [categoriaId, setCategoriaId] = useState('')
  const [pagina, setPagina] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    categoriesApi.getAll()
      .then((lista) => setCategorias(lista))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setPagina(1)
  }, [categoriaId, genero])

  useEffect(() => {
    let montado = true
    setCargando(true)
    homeApi.getCampeones({
      categoriaId: categoriaId ? Number(categoriaId) : undefined,
      genero: categoriaId ? undefined : genero,
      pagina: pagina - 1,
      tamanio: TAMANO_PAGINA,
    })
      .then((respuesta) => {
        if (!montado) return
        setCampeones(respuesta.contenido)
        setTotal(respuesta.totalElementos)
        setError(null)
      })
      .catch((errorCapturado: unknown) => { if (montado) setError(obtenerMensajeErrorApi(errorCapturado)) })
      .finally(() => { if (montado) setCargando(false) })
    return () => { montado = false }
  }, [categoriaId, genero, pagina])

  // Solo las categorías del género elegido, de mayor a menor nivel (nivel 1 = más alto).
  const categoriasDelGenero = useMemo(
    () => categorias
      .filter((c) => c.genero === genero)
      .sort((a, b) => a.nivel - b.nivel || a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })),
    [categorias, genero]
  )
  const offset = (pagina - 1) * TAMANO_PAGINA

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <NavLink to="/" className="mb-6 flex items-center gap-2 text-sm" style={{ color: 'var(--rp-muted-light)' }}>
        <ArrowLeft size={15} /> Volver al inicio
      </NavLink>

      <header className="mb-6">
        <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: 'var(--rp-gold)' }}>Histórico</p>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-black" style={{ color: 'var(--rp-green-800)' }}>
          <Trophy size={26} /> Todos los campeones
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--rp-muted-light)' }}>Cada pareja que levantó un título en el circuito.</p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="filtro-genero" className="text-sm font-bold" style={{ color: 'var(--rp-green-800)' }}>Género</label>
          <select
            id="filtro-genero"
            value={genero}
            onChange={(event) => { setGenero(event.target.value as Genero); setCategoriaId('') }}
            className="rounded-md border px-3 py-2 text-sm font-semibold"
            style={{ borderColor: 'var(--rp-border-light)', background: '#fff', color: 'var(--rp-green-800)' }}
          >
            <option value="MASCULINO">Masculino</option>
            <option value="FEMENINO">Femenino</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="filtro-categoria" className="text-sm font-bold" style={{ color: 'var(--rp-green-800)' }}>Categoría</label>
          <select
            id="filtro-categoria"
            value={categoriaId}
            onChange={(event) => setCategoriaId(event.target.value)}
            className="rounded-md border px-3 py-2 text-sm font-semibold"
            style={{ borderColor: 'var(--rp-border-light)', background: '#fff', color: 'var(--rp-green-800)' }}
          >
            <option value="">Todas las categorías</option>
            {categoriasDelGenero.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}
          </select>
        </div>
      </div>

      {error ? (
        <StatusMessage type="error" title="Error" description={error} />
      ) : cargando && campeones.length === 0 ? (
        <StatusMessage type="loading" title="Cargando campeones..." />
      ) : campeones.length === 0 ? (
        <StatusMessage type="empty" title="Sin campeones" description="Todavía no hay campeones publicados para este filtro." />
      ) : (
        <div className="champs-wrap" style={{ transition: 'opacity .15s ease', opacity: cargando ? 0.5 : 1 }}>
          <table className="champs-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Torneo</th>
                <th>Pareja campeona</th>
                <th>Resultado final</th>
                <th className="ct-cat-head">Categoría</th>
              </tr>
            </thead>
            <tbody>
              {campeones.map((item, index) => (
                <tr key={`${item.torneoId}-${item.categoriaId}`}>
                  <td><div className="ct-num">{String(offset + index + 1).padStart(2, '0')}</div></td>
                  <td>
                    <div className="ct-torneo">{item.torneoNombre ?? 'Torneo'}</div>
                    <div className="ct-fecha">{`${fechaCompacta(item.fecha)} - ${item.lugarNombre ?? 'Sede a confirmar'}`}</div>
                  </td>
                  <td>
                    <div className="ct-pair">
                      <div className="ct-trophy"><Trophy size={20} /></div>
                      <div className="ct-names">
                        {item.campeonaNombre ?? 'Sin dato'}
                        {item.subcampeonaNombre && <div className="ct-fecha">Subcampeón: {item.subcampeonaNombre}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="ct-score">{resultadoFinal(item)}</div>
                  </td>
                  <td className="ct-cat"><span className="ct-pill">{item.categoriaNombre ?? 'Categoría'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="champ-cards">
            {campeones.map((item, index) => (
              <article key={`${item.torneoId}-${item.categoriaId}`} className="champ-card">
                <div className="champ-card-row">
                  <div className="champ-card-num">{String(offset + index + 1).padStart(2, '0')}</div>
                  <div className="champ-card-info">
                    <div className="champ-card-torneo">{item.torneoNombre ?? 'Torneo'}</div>
                    <div className="champ-card-fecha">
                      {`${fechaCompacta(item.fecha)} - ${item.lugarNombre ?? 'Sede a confirmar'} - ${item.categoriaNombre ?? 'Categoría'}`}
                    </div>
                  </div>
                </div>
                <div className="champ-card-winner">
                  <div className="ct-trophy"><Trophy size={20} /></div>
                  <div>
                    <div className="champ-card-names">{item.campeonaNombre ?? 'Sin dato'}</div>
                    <div className="champ-card-score">{resultadoFinal(item)}{item.subcampeonaNombre ? ` · Subcampeón: ${item.subcampeonaNombre}` : ''}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      <Pagination page={pagina} pageSize={TAMANO_PAGINA} total={total} onPageChange={setPagina} />
    </main>
  )
}
