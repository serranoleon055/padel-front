import { NavLink } from 'react-router-dom'

import { Button } from '@/shared/ui/Button'

export default function NotFoundPage() {
  return (
    <section className="mx-auto max-w-xl px-4 py-20 text-center">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-rp-accent">Error 404</p>
      <h1 className="mt-3 text-3xl font-black text-rp-text">Esta página no existe</h1>
      <p className="mt-3 text-sm text-rp-muted">
        El enlace puede estar mal escrito o la página ya no está disponible.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Button asChild><NavLink to="/">Ir al inicio</NavLink></Button>
        <Button variant="ghost" asChild><NavLink to="/torneos">Ver torneos</NavLink></Button>
      </div>
    </section>
  )
}
