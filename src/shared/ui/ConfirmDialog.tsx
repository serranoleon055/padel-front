import { memo, useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'

type ConfirmDialogProps = {
    isOpen: boolean
    onClose: () => void
    /** Recibe el motivo cuando el diálogo lo pide; string vacío si no. */
    onConfirm: (motivo: string) => void
    title: string
    description: string
    confirmLabel?: string
    loadingLabel?: string
    tono?: 'danger' | 'normal'
    isLoading?: boolean
    /** Para las acciones que quedan auditadas: sin motivo no se puede confirmar. */
    pedirMotivo?: boolean
    motivoLabel?: string
    motivoPlaceholder?: string
}

export const ConfirmDialog = memo(function ConfirmDialog({ isOpen, onClose, onConfirm, title, description, confirmLabel = 'Eliminar', loadingLabel = 'Eliminando...', tono = 'danger', isLoading = false, pedirMotivo = false, motivoLabel = 'Motivo', motivoPlaceholder = 'Por qué se anula' }: ConfirmDialogProps) {
    const esPeligro = tono === 'danger'
    const [motivo, setMotivo] = useState('')

    // Al reabrir el diálogo el campo arranca limpio: el motivo de la vez anterior no
    // puede quedar pegado en una anulación distinta.
    useEffect(() => { if (isOpen) setMotivo('') }, [isOpen])

    const faltaMotivo = pedirMotivo && motivo.trim().length === 0

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <div className="flex flex-col gap-5">
                <div className="flex items-start gap-3">
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${esPeligro ? 'bg-rp-danger/15' : 'bg-rp-accent/15'}`}>
                    <AlertTriangle size={20} className={esPeligro ? 'text-rp-danger' : 'text-rp-accent'} />
                </div>
                <p className="whitespace-pre-line text-sm text-rp-muted">{description}</p>
                </div>
                {pedirMotivo && (
                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-bold uppercase tracking-wide text-rp-muted">{motivoLabel}</span>
                        <textarea
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            rows={2}
                            maxLength={300}
                            placeholder={motivoPlaceholder}
                            className="w-full rounded-md border border-rp-border bg-rp-bg px-3 py-2 text-base text-rp-text outline-none focus:border-rp-accent"
                        />
                    </label>
                )}
                <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>Cancelar</Button>
                <Button size="sm" className={esPeligro ? 'bg-rp-danger text-white hover:bg-rp-danger/80 shadow-none' : undefined} onClick={() => onConfirm(motivo.trim())} disabled={isLoading || faltaMotivo}>
                    {isLoading ? loadingLabel : confirmLabel}
                </Button>
                </div>
            </div>
        </Modal>
    )
})
