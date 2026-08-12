import { apiClient } from '@/shared/api/apiClient'

export interface FilaImportada {
  numero: number
  nombre: string
  telefono: string | null
  resultado: 'NUEVO' | 'REPETIDO' | 'ERROR'
  /** Por qué se saltea o con quién choca. Null si entra limpia. */
  detalle: string | null
}

export interface ImportacionResultado {
  /** true = todavía no se guardó nada. */
  vistaPrevia: boolean
  filasLeidas: number
  nuevos: number
  repetidos: number
  conError: number
  filas: FilaImportada[]
}

export type TipoImportacion = 'jugadores' | 'clientes'

async function enviar(tipo: TipoImportacion, archivo: File, vistaPrevia: boolean) {
  const cuerpo = new FormData()
  cuerpo.append('file', archivo)
  const { data } = await apiClient.post<ImportacionResultado>(`/api/importar/${tipo}`, cuerpo, {
    params: { vistaPrevia },
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const importacionApi = {
  /** No escribe nada: devuelve el mismo informe que devolvería la importación real. */
  previsualizar: (tipo: TipoImportacion, archivo: File) => enviar(tipo, archivo, true),
  confirmar: (tipo: TipoImportacion, archivo: File) => enviar(tipo, archivo, false),
}
