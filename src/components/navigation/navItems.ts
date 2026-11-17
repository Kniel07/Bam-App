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
  { to: '/letters', label: 'Letters', icon: Mail },
  { to: '/memories', label: 'Memories', icon: Images },
  { to: '/together', label: 'Together', icon: HeartHandshake },
]

/** Secondary destinations, listed in More (five-slot bottom bar; TD-026). */
export const SECONDARY_NAV: NavItem[] = [{ to: '/story', label: 'Our Story', icon: BookHeart }]
