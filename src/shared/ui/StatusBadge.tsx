import { memo } from 'react'
import { cn } from '@/shared/lib/utils'

type StatusBadgeProps = {
  children: string
  tone?: 'neutral' | 'live' | 'success' | 'warning'
}

const tones = {
  neutral: 'bg-rp-surface-2 text-rp-muted',
  live: 'bg-rp-danger/15 text-rp-danger',
  success: 'bg-rp-accent/15 text-rp-accent',
  warning: 'bg-rp-amber/15 text-rp-amber',
}

export const StatusBadge = memo(function StatusBadge({ children, tone = 'neutral' }: StatusBadgeProps) {
  return <span className={cn('rounded-full px-3 py-1 text-xs font-black', tones[tone])}>{children}</span>
})
