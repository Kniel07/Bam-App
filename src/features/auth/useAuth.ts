import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from './AuthProvider'

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}

/** The signed-in member's role, or null when not a member. */
export function useRole() {
  const { auth } = useAuth()
  return auth.status === 'member' ? auth.role : null
}
