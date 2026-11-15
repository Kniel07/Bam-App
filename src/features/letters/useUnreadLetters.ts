import { useAuth } from '@/features/auth/useAuth'
import { useNow } from '@/lib/time/useNow'
import { useLetters } from './hooks'
import { getUnreadAvailableLetters } from './logic'

/** Letters written for the signed-in member that are waiting to be opened (either role, CR-01). */
export function useUnreadLetters() {
  const { auth } = useAuth()
  const letters = useLetters()
  const now = useNow()
  const userId = auth.status === 'member' ? auth.userId : null
  if (!letters.data) return []
  return getUnreadAvailableLetters(letters.data, now, userId)
}
