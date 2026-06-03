import { memo } from 'react'
import { AlertCircle, Loader2, SearchX } from 'lucide-react'

type StatusMessageProps = {
  title: string
  description?: string
  type?: 'loading' | 'error' | 'empty'
}

export const StatusMessage = memo(function StatusMessage({ description, title, type = 'empty' }: StatusMessageProps) {
  const Icon = type === 'loading' ? Loader2 : type === 'error' ? AlertCircle : SearchX

  return (
    <div className="rounded-lg border border-rp-border bg-rp-surface/82 px-5 py-10 text-center">
      <Icon
        className={type === 'loading' ? 'mx-auto animate-spin text-rp-accent' : 'mx-auto text-rp-accent'}
        size={34}
      />
      <p className="mt-4 text-sm font-bold text-rp-text">{title}</p>
      {description ? <p className="mt-1 text-sm text-rp-muted">{description}</p> : null}
    </div>
  )
})
