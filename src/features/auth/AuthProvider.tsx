import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import type { MemberRole } from '@/lib/supabase/database.types'

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  /** Signed in, but not one of the two members (e.g. a stray account). */
  | { status: 'notMember'; userId: string }
  | { status: 'member'; userId: string; role: MemberRole }
  /** Couldn't determine membership (network/API failure). */
  | { status: 'error'; userId: string }

export interface AuthContextValue {
  auth: AuthState
  signOut: () => Promise<void>
  retry: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

async function resolveMembership(session: Session | null): Promise<AuthState> {
  if (!session) return { status: 'signedOut' }
  const userId = session.user.id
  // RLS returns the caller's row only if they are a member.
  const { data, error } = await supabase
    .from('relationship_members')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return { status: 'error', userId }
  if (!data) return { status: 'notMember', userId }
  return { status: 'member', userId, role: data.role }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let isActive = true
    const apply = (session: Session | null) => {
      void resolveMembership(session).then((next) => {
        if (isActive) setAuth(next)
      })
    }

    void supabase.auth.getSession().then(({ data }) => apply(data.session))
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      // Token refreshes don't change membership; skip the extra query.
      if (event === 'TOKEN_REFRESHED') return
      // Defer: supabase-js forbids awaiting its own calls inside this callback.
      setTimeout(() => apply(session), 0)
    })

    return () => {
      isActive = false
      subscription.subscription.unsubscribe()
    }
  }, [attempt])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setAuth({ status: 'signedOut' })
  }, [])

  const retry = useCallback(() => {
    setAuth({ status: 'loading' })
    setAttempt((value) => value + 1)
  }, [])

  const value = useMemo(() => ({ auth, signOut, retry }), [auth, signOut, retry])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
