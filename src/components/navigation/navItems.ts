import { BookHeart, HeartHandshake, House, Images, Mail, type LucideIcon } from 'lucide-react'

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
  { to: '/letters', label: 'Letters', icon: Mail },
  { to: '/together', label: 'Together', icon: HeartHandshake },
]

/** Planned destinations, enabled slice by slice (S5 memories). */
export const PLANNED_NAV: Record<'memories', NavItem> = {
  memories: { to: '/memories', label: 'Memories', icon: Images },
}
