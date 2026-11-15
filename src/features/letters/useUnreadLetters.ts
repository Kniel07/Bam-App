import { useRole } from '@/features/auth/useAuth'
import { useNow } from '@/lib/time/useNow'
import { useLetters } from './hooks'
import { getUnreadAvailableLetters } from './logic'

/** Letters waiting for her (partner only; the owner wrote them). */
export function useUnreadLetters() {
  const isPartner = useRole() === 'partner'
  const letters = useLetters()
  const now = useNow()
  if (!isPartner || !letters.data) return []
  return getUnreadAvailableLetters(letters.data, now)
}
