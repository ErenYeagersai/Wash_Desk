import React from 'react'
import { cn } from '@/utils/cn'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  leftIcon?: React.ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-primary text-white hover:bg-primary-light focus-visible:outline-primary',
  secondary: 'bg-secondary text-white hover:bg-amber-600 focus-visible:outline-secondary',
  outline:   'border border-primary text-primary bg-white hover:bg-primary/5',
  ghost:     'text-primary hover:bg-primary/10',
  danger:    'bg-red-600 text-white hover:bg-red-700',
}

const sizeClasses: Record<Size, string> = {
  sm:  'px-3 py-1.5 text-sm',
  md:  'px-4 py-2 text-sm',
  lg:  'px-6 py-3 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
        'transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      {loading ? <Spinner size="sm" /> : leftIcon}
      {children}
    </button>
  )
}
