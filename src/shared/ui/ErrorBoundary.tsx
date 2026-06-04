import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

import { Button } from '@/shared/ui/Button'

type Props = { children: ReactNode }
type State = { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[ErrorBoundary]', error, info.componentStack)
    }

    render() {
        if (this.state.hasError) {
            return (
                <section className="mx-auto flex min-h-[50svh] max-w-md items-center px-4 py-10">
                    <div className="w-full rounded-lg border border-rp-border bg-rp-surface/82 p-6 text-center">
                        <h1 className="text-2xl font-black text-rp-text">Algo salió mal</h1>
                        <p className="mt-3 text-sm text-rp-muted">Ocurrió un error inesperado. Probá recargar la página o volver al inicio.</p>
                        <Button className="mt-6" onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/' }}>
                            Volver al inicio
                        </Button>
                    </div>
                </section>
            )
        }
        return this.props.children
    }
}
