import { memo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'

type ConfirmDialogProps = {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    description: string
    confirmLabel?: string
    loadingLabel?: string
    tono?: 'danger' | 'normal'
    isLoading?: boolean
}

export const ConfirmDialog = memo(function ConfirmDialog({ isOpen, onClose, onConfirm, title, description, confirmLabel = 'Eliminar', loadingLabel = 'Eliminando...', tono = 'danger', isLoading = false }: ConfirmDialogProps) {
    const esPeligro = tono === 'danger'
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <div className="flex flex-col gap-5">
                <div className="flex items-start gap-3">
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${esPeligro ? 'bg-rp-danger/15' : 'bg-rp-accent/15'}`}>
                    <AlertTriangle size={20} className={esPeligro ? 'text-rp-danger' : 'text-rp-accent'} />
                </div>
                <p className="whitespace-pre-line text-sm text-rp-muted">{description}</p>
                </div>
                <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>Cancelar</Button>
                <Button size="sm" className={esPeligro ? 'bg-rp-danger text-white hover:bg-rp-danger/80 shadow-none' : undefined} onClick={onConfirm} disabled={isLoading}>
                    {isLoading ? loadingLabel : confirmLabel}
                </Button>
                </div>
            </div>
        </Modal>
    )
})