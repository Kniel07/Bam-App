/** Application-wide constants. Nothing personal may ever live here (SEC-01). */

/**
 * Synthetic, non-personal login address of the partner account (TD-018).
 * Shipped in the public bundle on purpose: it identifies no one.
 */
export const PARTNER_LOGIN_ADDRESS = 'partner@our-little-universe.example.com'

/** Route that receives the QR key: /key#k=<secret>. */
export const KEY_ROUTE = '/key'

/** Partner key secrets are 32 random bytes, base64url-encoded (43 chars). */
export const PARTNER_KEY_LENGTH = 43

export const SIGNED_URL_TTL_SECONDS = 60 * 60
export const MAX_IMAGE_DIMENSION = 2048
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
export const MEMORIES_PAGE_SIZE = 24
