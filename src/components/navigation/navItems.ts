import { BookHeart, House, Images, Mail, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

/**
 * Primary destinations (PAGE-STRUCTURE §3). Modules are added here as their
 * build slice lands, so navigation never points at a page that doesn't exist.
 */
export const PRIMARY_NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: House },
  { to: '/story', label: 'Story', icon: BookHeart },
]

/** Planned destinations, enabled slice by slice (S4 letters, S5 memories). */
export const PLANNED_NAV: Record<'letters' | 'memories', NavItem> = {
  letters: { to: '/letters', label: 'Letters', icon: Mail },
  memories: { to: '/memories', label: 'Memories', icon: Images },
}
