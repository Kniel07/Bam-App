import type { HTMLAttributes } from 'react'

type CardTone = 'surface' | 'blush' | 'lavender'

const TONE_CLASSES: Record<CardTone, string> = {
  surface: 'bg-surface',
  blush: 'bg-blush',
  lavender: 'bg-lavender-mist',
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CardTone
}

export function Card({ tone = 'surface', className = '', ...rest }: CardProps) {
  return <div className={`rounded-md shadow-soft ${TONE_CLASSES[tone]} ${className}`} {...rest} />
}
