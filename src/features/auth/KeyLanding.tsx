import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { BareLayout } from '@/app/layouts/BareLayout'
import { Heart, WaxSeal } from '@/components/shared/Decorations'
import { supabase } from '@/lib/supabase/client'
import { KEY_ROUTE, PARTNER_LOGIN_ADDRESS } from '@/lib/constants'
import { copy } from '@/lib/copy'
import { parsePartnerKeyFragment } from './partnerKey'

type KeyState = 'opening' | 'missing' | 'invalid' | 'unavailable'

/**
 * Receives the QR key (/key#k=<secret>), signs the partner in, and goes home.
 * The fragment is removed from the address bar BEFORE any network request, so
 * the key never lingers in history (TD-008, FR-AUTH-09).
 */
export function KeyLanding() {
  const navigate = useNavigate()
  // Read the key exactly once, on first render.
  const [key] = useState(() => parsePartnerKeyFragment(window.location.hash))
  const [state, setState] = useState<KeyState>(key ? 'opening' : 'missing')
  const hasStarted = useRef(false)

  useEffect(() => {
    if (hasStarted.current) return // StrictMode runs effects twice in development
    hasStarted.current = true

    window.history.replaceState(null, '', KEY_ROUTE)
    if (!key) return

    void supabase.auth
      .signInWithPassword({ email: PARTNER_LOGIN_ADDRESS, password: key })
      .then(({ error }) => {
        if (!error) {
          navigate('/', { replace: true })
          return
        }
        // 400-class = wrong/rotated key; anything else = network or service trouble.
        setState(error.status !== undefined && error.status < 500 ? 'invalid' : 'unavailable')
      })
  }, [key, navigate])

  if (state === 'opening') {
    return (
      <BareLayout>
        <div role="status" aria-live="polite">
          <Heart className="mx-auto mb-6 size-12 animate-pulse-soft text-rose" />
          <p className="font-hand text-hand-lg text-rose-deep">{copy.key.opening}</p>
        </div>
      </BareLayout>
    )
  }

  return (
    <BareLayout>
      <WaxSeal className="mx-auto mb-8 size-16 opacity-80" isBroken />
      <p role="alert" className="text-h3 text-ink">
        {copy.key[state]}
      </p>
    </BareLayout>
  )
}
