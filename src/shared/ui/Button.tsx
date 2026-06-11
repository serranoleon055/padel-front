import { memo } from 'react'
import { Slot } from '@radix-ui/react-slot'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
  children: ReactNode
  size?: 'sm' | 'md'
  variant?: 'primary' | 'ghost' | 'subtle' | 'danger'
}

const variants = {
  primary: 'bg-rp-accent text-white shadow-sm shadow-rp-accent/20 hover:bg-[#27542f]',
  ghost: 'border border-rp-border bg-transparent text-rp-text hover:bg-rp-surface-2',
  subtle: 'bg-rp-surface-2 text-rp-text hover:bg-rp-border',
  danger: 'bg-rp-danger text-white hover:opacity-90',
}

const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
}

export const Button = memo(function Button({
  asChild = false,
  children,
  className,
  size = 'md',
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rp-accent disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      type={asChild ? undefined : type}
      {...props}
    >
      {children}
    </Comp>
  )
})
