import { Navigate, Outlet } from 'react-router'
import { BareLayout } from '@/app/layouts/BareLayout'
import { Heart } from '@/components/shared/Decorations'
import { Button } from '@/components/ui/Button'
import { copy } from '@/lib/copy'
import { LockedScreen } from './LockedScreen'
import { useAuth } from './useAuth'

function AuthLoading() {
  return (
    <BareLayout>
      <div role="status" aria-label="Loading">
        <Heart className="mx-auto size-10 animate-pulse-soft text-rose" />
      </div>
    </BareLayout>
  )
}

/**
 * Renders child routes only for the two members. Everyone else sees the
 * Locked screen at the same URL, so route names reveal nothing. This is UX;
 * the real protection is RLS in the database.
 */
export function RequireMember() {
  const { auth, retry } = useAuth()
  switch (auth.status) {
    case 'loading':
      return <AuthLoading />
    case 'member':
      return <Outlet />
    case 'error':
      return (
        <BareLayout>
          <p role="alert" className="text-h3">
            {copy.errors.generic}
          </p>
          <Button className="mt-6" variant="secondary" onClick={retry}>
            {copy.errors.retry}
          </Button>
        </BareLayout>
      )
    case 'signedOut':
    case 'notMember':
      return <LockedScreen />
  }
}

/** Owner-only routes; the partner is sent home (and RLS rejects writes anyway). */
export function RequireOwner() {
  const { auth } = useAuth()
  if (auth.status === 'member' && auth.role === 'owner') return <Outlet />
  return <Navigate to="/" replace />
}
