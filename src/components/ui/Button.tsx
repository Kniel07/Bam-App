import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  iconLeft?: ReactNode
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-rose-deep text-white shadow-soft hover:shadow-lift',
  secondary: 'bg-surface text-rose-deep border border-line hover:bg-blush',
  ghost: 'bg-transparent text-rose-deep hover:bg-blush',
  danger: 'bg-surface text-error border border-line hover:bg-blush',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-4 text-small',
  md: 'min-h-12 px-6 text-body',
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  iconLeft,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-semibold transition duration-[var(--duration-fast)] ease-[var(--ease-gentle)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {isLoading ? <LoaderCircle aria-hidden className="size-5 animate-spin" /> : iconLeft}
      {children}
    </button>
  )
}
