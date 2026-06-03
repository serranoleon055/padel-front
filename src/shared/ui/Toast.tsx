import { createContext, memo, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Check, Info, X, AlertTriangle } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

type ToastType = 'success' | 'error' | 'info' | 'warning'

type Toast = {
  id: number
  message: string
  type: ToastType
}

type ToastContextValue = {
  toast: (message: string, type?: ToastType) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++nextId
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => dismiss(id), 4000)
  }, [dismiss])

  const success = useCallback((message: string) => toast(message, 'success'), [toast])
  const error = useCallback((message: string) => toast(message, 'error'), [toast])
  const info = useCallback((message: string) => toast(message, 'info'), [toast])

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

const icons: Record<ToastType, ReactNode> = {
  success: <Check size={15} />,
  error: <X size={15} />,
  info: <Info size={15} />,
  warning: <AlertTriangle size={15} />,
}

const styles: Record<ToastType, string> = {
  success: 'border-rp-accent/40 bg-rp-accent/10 text-rp-accent',
  error: 'border-rp-danger/40 bg-rp-danger/10 text-rp-danger',
  info: 'border-rp-border bg-rp-surface text-rp-text',
  warning: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
}

const ToastItem = memo(function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    requestAnimationFrame(() => el.classList.add('opacity-100', 'translate-y-0'))
  }, [])

  return (
    <div
      ref={ref}
      className={cn(
        'flex min-w-64 max-w-sm items-center gap-3 rounded-lg border px-4 py-3 text-sm font-bold shadow-lg',
        'opacity-0 translate-y-2 transition-all duration-200',
        styles[toast.type],
      )}
    >
      {icons[toast.type]}
      <span className="flex-1">{toast.message}</span>
      <button onClick={() => onDismiss(toast.id)} className="ml-1 opacity-60 hover:opacity-100">
        <X size={13} />
      </button>
    </div>
  )
})

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
