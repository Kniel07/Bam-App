import { useRole } from '@/features/auth/useAuth'
import { useCurrentMember } from '@/features/relationship/hooks'
import type { MemberRole } from '@/lib/supabase/database.types'

const ROLE_LABEL: Record<MemberRole, string> = { owner: 'Owner', partner: 'Partner' }

// Distinct colour per account, so a glance tells which one this phone is on.
// White text contrast: lavender-deep 6.0:1, rose-deep 6.1:1 (WCAG AA).
const ROLE_COLOUR: Record<MemberRole, string> = {
  owner: 'bg-lavender-deep text-white',
  partner: 'bg-rose-deep text-white',
}

/** Signed-in identity: display name (or role when unnamed), role, initial. */
export function useIdentity(): { name: string; role: MemberRole; initial: string } | null {
  const role = useRole()
  const member = useCurrentMember()
  if (!role) return null
  const name = member?.displayName.trim() || ROLE_LABEL[role]
  return { name, role, initial: name.charAt(0).toUpperCase() }
}

/** Small round avatar with the signed-in member's initial. Decorative next to a text label. */
export function IdentityAvatar({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const identity = useIdentity()
  if (!identity) return null
  const sizeClass = size === 'md' ? 'size-11 text-h3' : 'size-6 text-[0.75rem]'
  return (
    <span
      aria-hidden
      data-role={identity.role}
      className={`grid shrink-0 place-items-center rounded-full font-bold leading-none ${sizeClass} ${ROLE_COLOUR[identity.role]}`}
    >
      {identity.initial}
    </span>
  )
}

/** "Signed in as …" card at the top of More. */
export function IdentityCard() {
  const identity = useIdentity()
  if (!identity) return null
  return (
    <div className="mb-4 flex items-center gap-3 rounded-md bg-cream px-4 py-3">
      <IdentityAvatar size="md" />
      <div className="min-w-0 flex-1">
        <p className="text-small text-ink-soft">Signed in as</p>
        <p className="truncate text-h3 text-ink">{identity.name}</p>
      </div>
      <span
        className={`rounded-full px-3 py-1 text-micro font-bold uppercase tracking-[0.06em] ${
          identity.role === 'owner' ? 'bg-lavender-mist text-lavender-deep' : 'bg-blush text-rose-deep'
        }`}
      >
        {ROLE_LABEL[identity.role]}
      </span>
    </div>
  )
}
