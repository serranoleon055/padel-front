import { memo, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

type ModalProps = {
    children: ReactNode
    isOpen: boolean
    onClose: () => void
    title: string
    size?: 'sm' | 'md' | 'lg'
}

const sizeClass = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-2xl' }

export const Modal = memo(function Modal({ children, isOpen, onClose, title, size = 'md' }: ModalProps) {
    const onCloseRef = useRef(onClose)
    onCloseRef.current = onClose

    useEffect(() => {
        if (!isOpen) return
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current() }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [isOpen])

    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
            <div className={cn('relative w-full rounded-xl border border-rp-border bg-rp-surface shadow-2xl', sizeClass[size])}>
                <div className="flex items-center justify-between border-b border-rp-border px-5 py-4">
                <h2 id="modal-title" className="text-base font-black text-rp-text">{title}</h2>
                <button onClick={onClose} className="flex size-8 items-center justify-center rounded-md text-rp-muted hover:bg-rp-surface-2 hover:text-rp-text" aria-label="Cerrar">
                    <X size={18} />
                </button>
                </div>
                <div className="max-h-[calc(100svh-200px)] overflow-y-auto px-5 py-5">{children}</div>
            </div>
        </div>
    )
})