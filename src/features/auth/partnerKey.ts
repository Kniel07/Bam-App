import { PARTNER_KEY_LENGTH } from '@/lib/constants'

const KEY_PATTERN = new RegExp(`^[A-Za-z0-9_-]{${PARTNER_KEY_LENGTH}}$`)

/**
 * Extracts the partner key from a URL fragment of the form `#k=<secret>`.
 * Returns null for anything malformed, so garbage never reaches the auth API.
 */
export function parsePartnerKeyFragment(hash: string): string | null {
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash
  const key = new URLSearchParams(fragment).get('k')
  if (!key || !KEY_PATTERN.test(key)) return null
  return key
}
