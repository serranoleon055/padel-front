import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { configuracionSedeApi } from '@/features/configuracion/configuracionApi'
import { configuracionSedeDefault } from '@/config/sede'
import type { ConfiguracionSede } from '@/shared/types/api'

type ContextoConfiguracion = {
  configuracion: ConfiguracionSede
  refrescar: () => Promise<void>
}

const ConfiguracionSedeContext = createContext<ContextoConfiguracion>({
  configuracion: configuracionSedeDefault,
  refrescar: async () => {},
})

function combinarConDefaults(datos: ConfiguracionSede): ConfiguracionSede {
  return {
    ...configuracionSedeDefault,
    ...Object.fromEntries(Object.entries(datos).filter(([, valor]) => valor != null && !(Array.isArray(valor) && valor.length === 0))),
  } as ConfiguracionSede
}

export function ConfiguracionSedeProvider({ children }: { children: ReactNode }) {
  const [configuracion, setConfiguracion] = useState<ConfiguracionSede>(configuracionSedeDefault)

  const refrescar = useCallback(async () => {
    try {
      const datos = await configuracionSedeApi.get()
      setConfiguracion(combinarConDefaults(datos))
    } catch {
      setConfiguracion(configuracionSedeDefault)
    }
  }, [])

  useEffect(() => {
    void refrescar()
  }, [refrescar])

  const valor = useMemo(() => ({ configuracion, refrescar }), [configuracion, refrescar])

  return <ConfiguracionSedeContext.Provider value={valor}>{children}</ConfiguracionSedeContext.Provider>
}

export function useConfiguracionSede() {
  return useContext(ConfiguracionSedeContext)
}
