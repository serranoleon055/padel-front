type CategoriaOrdenable = { nivel: number; genero: string }

export function ordenarCategorias<T extends CategoriaOrdenable>(categorias: T[]): T[] {
  return [...categorias].sort((a, b) => {
    if (a.nivel !== b.nivel) return a.nivel - b.nivel
    if (a.genero === b.genero) return 0
    return a.genero === 'MASCULINO' ? -1 : 1
  })
}
