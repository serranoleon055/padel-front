import { Upload } from 'lucide-react'
import { useRef, useState } from 'react'

import { importacionApi, type ImportacionResultado, type TipoImportacion } from '@/features/importacion/importacionApi'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { useToast } from '@/shared/ui/Toast'

const COLUMNAS: Record<TipoImportacion, string> = {
  jugadores: 'nombre, apellido, telefono, genero',
  clientes: 'nombre, telefono, email',
}

const TONO: Record<string, string> = {
  NUEVO: 'text-rp-accent',
  REPETIDO: 'text-rp-muted',
  ERROR: 'text-rp-danger',
}

/**
 * Importar la planilla que el club ya tiene.
 *
 * <p>Siempre en dos pasos: primero se muestra qué va a pasar con cada fila y recién con
 * eso a la vista se confirma. Importar 200 registros a ciegas y descubrir después que se
 * duplicaron es peor que no importar.
 */
export function ImportarCsvModal({ tipo, abierto, onClose, onImportado }: {
  tipo: TipoImportacion
  abierto: boolean
  onClose: () => void
  onImportado: () => void
}) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [previa, setPrevia] = useState<ImportacionResultado | null>(null)
  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputArchivo = useRef<HTMLInputElement>(null)
  const { success: avisoExito } = useToast()

  function limpiar() {
    setArchivo(null)
    setPrevia(null)
    setError(null)
  }

  async function elegir(file: File) {
    setArchivo(file)
    setPrevia(null)
    setError(null)
    setTrabajando(true)
    try {
      setPrevia(await importacionApi.previsualizar(tipo, file))
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    } finally {
      setTrabajando(false)
    }
  }

  async function confirmar() {
    if (!archivo) return
    setTrabajando(true)
    setError(null)
    try {
      const resultado = await importacionApi.confirmar(tipo, archivo)
      avisoExito(`Se agregaron ${resultado.nuevos} ${tipo}`)
      limpiar()
      onClose()
      onImportado()
    } catch (e: unknown) {
      setError(obtenerMensajeErrorApi(e))
    } finally {
      setTrabajando(false)
    }
  }

  return (
    <Modal isOpen={abierto} onClose={() => { limpiar(); onClose() }} title={`Importar ${tipo} desde una planilla`} size="md">
      <div className="flex flex-col gap-4">
        <div className="rounded-md border border-rp-border bg-rp-bg/55 px-3 py-2">
          <p className="text-sm text-rp-text">
            Guardá tu Excel como CSV y subilo. La primera fila tiene que ser la de los títulos.
          </p>
          <p className="mt-1 text-xs text-rp-muted">
            Columnas que se leen: <span className="font-bold">{COLUMNAS[tipo]}</span>.
            Las que sobren se ignoran, y el orden no importa.
          </p>
        </div>

        <input
          ref={inputArchivo}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void elegir(f) }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => inputArchivo.current?.click()} disabled={trabajando}>
            <Upload size={15} />{archivo ? 'Elegir otro archivo' : 'Elegir archivo CSV'}
          </Button>
          {archivo && <span className="text-sm text-rp-muted">{archivo.name}</span>}
        </div>

        {error && <p className="rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">{error}</p>}
        {trabajando && !previa && <p className="text-sm text-rp-muted">Leyendo el archivo...</p>}

        {previa && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Resumen titulo="Se van a agregar" valor={previa.nuevos} destacado />
              <Resumen titulo="Ya existían" valor={previa.repetidos} />
              <Resumen titulo="Con problemas" valor={previa.conError} alerta={previa.conError > 0} />
            </div>

            <div className="max-h-72 overflow-y-auto rounded-md border border-rp-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-rp-surface-2">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-black uppercase tracking-wide text-rp-muted">Fila</th>
                    <th className="px-3 py-2 text-left text-xs font-black uppercase tracking-wide text-rp-muted">Nombre</th>
                    <th className="px-3 py-2 text-left text-xs font-black uppercase tracking-wide text-rp-muted">Qué pasa</th>
                  </tr>
                </thead>
                <tbody>
                  {previa.filas.map((fila) => (
                    <tr key={fila.numero} className="border-t border-rp-border">
                      <td className="px-3 py-1.5 text-rp-muted">{fila.numero}</td>
                      <td className="px-3 py-1.5 text-rp-text">
                        {fila.nombre || <span className="text-rp-muted">(sin nombre)</span>}
                        {fila.telefono && <span className="ml-2 text-xs text-rp-muted">{fila.telefono}</span>}
                      </td>
                      <td className={`px-3 py-1.5 font-bold ${TONO[fila.resultado]}`}>
                        {fila.resultado === 'NUEVO' ? 'Se agrega' : fila.resultado === 'REPETIDO' ? 'Se saltea' : 'Error'}
                        {fila.detalle && <span className="ml-2 font-normal text-rp-muted">{fila.detalle}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-rp-muted">
              Todavía no se guardó nada. Las filas repetidas y las que tienen problemas se saltean solas.
            </p>
          </>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => { limpiar(); onClose() }} disabled={trabajando}>Cancelar</Button>
          <Button size="sm" onClick={confirmar} disabled={trabajando || !previa || previa.nuevos === 0}>
            {trabajando ? 'Importando...' : previa ? `Agregar ${previa.nuevos}` : 'Agregar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function Resumen({ titulo, valor, destacado, alerta }: { titulo: string; valor: number; destacado?: boolean; alerta?: boolean }) {
  return (
    <div className="rounded-md border border-rp-border bg-rp-bg/55 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-rp-muted">{titulo}</p>
      <p className={`mt-0.5 text-xl font-black ${alerta ? 'text-rp-danger' : destacado ? 'text-rp-accent' : 'text-rp-text'}`}>{valor}</p>
    </div>
  )
}
