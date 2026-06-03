import { Lock } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/app/providers/AuthContext'
import { obtenerMensajeErrorApi } from '@/shared/lib/apiError'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'

type EstadoUbicacionLogin = { from?: { pathname?: string } }

export default function LoginPage() {
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const { login } = useAuth()

  const [usuario, setUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const destino = (ubicacion.state as EstadoUbicacionLogin | null)?.from?.pathname ?? '/admin'

  async function manejarEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setEnviando(true)
    setError(null)
    try {
      await login({ username: usuario, password: contrasena })
      navegar(destino, { replace: true })
    } catch (err) {
      setError(obtenerMensajeErrorApi(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-md items-center px-4 py-10">
      <form className="w-full rounded-lg border border-rp-border bg-rp-surface/82 p-6" onSubmit={manejarEnviar}>
        <div className="flex size-12 items-center justify-center rounded-lg bg-rp-accent text-rp-bg">
          <Lock size={22} />
        </div>
        <h1 className="mt-6 text-2xl font-black text-rp-text">Acceso admin</h1>

        <div className="mt-6 flex flex-col gap-4">
          <Input label="Usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" />
          <Input label="Contraseña" type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} autoComplete="current-password" />
        </div>

        {error ? (
          <div className="mt-4 rounded-md border border-rp-danger/40 bg-rp-danger/10 px-3 py-2 text-sm font-bold text-rp-danger">
            {error}
          </div>
        ) : null}

        <Button className="mt-6 w-full" disabled={enviando} type="submit">
          {enviando ? 'Ingresando...' : 'Ingresar'}
        </Button>
      </form>
    </section>
  )
}
