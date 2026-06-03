const TTL_MS = 60_000 // 60 segundos

type EntradaCache<T> = {
  data: T
  expiresAt: number
}

export class CacheSimple<T> {
  private entrada: EntradaCache<T> | null = null
  private promesaEnVuelo: Promise<T> | null = null

  isValid(): boolean {
    return this.entrada !== null && Date.now() < this.entrada.expiresAt
  }

  get(): T | null {
    return this.isValid() ? this.entrada!.data : null
  }

  set(datos: T): T {
    this.entrada = { data: datos, expiresAt: Date.now() + TTL_MS }
    return datos
  }

  invalidate(): void {
    this.entrada = null
    this.promesaEnVuelo = null
  }

  async fetch(cargador: () => Promise<T>): Promise<T> {
    const enCache = this.get()
    if (enCache !== null) return enCache
    if (this.promesaEnVuelo) return this.promesaEnVuelo
    this.promesaEnVuelo = cargador().then((datos) => {
      this.set(datos)
      this.promesaEnVuelo = null
      return datos
    })
    return this.promesaEnVuelo
  }
}
