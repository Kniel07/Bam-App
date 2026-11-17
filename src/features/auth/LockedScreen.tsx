import { Link } from 'react-router'
import { BareLayout } from '@/app/layouts/BareLayout'
import { WaxSeal } from '@/components/shared/Decorations'
import { copy } from '@/lib/copy'

/**
 * Shown to anyone without a member session. Reveals nothing personal (FR-AUTH-04).
 * The quiet owner link exists because the installed app has no address bar
 * (FR-AUTH-10, amended): without it the owner couldn't sign in from the app.
 */
export function LockedScreen() {
  return (
    <BareLayout>
      <WaxSeal className="mx-auto mb-8 size-20 drop-shadow-[0_8px_24px_rgb(156_69_96/0.18)]" />
      <h1 className="text-h1">{copy.locked.title}</h1>
      <p className="mt-3 font-hand text-hand-lg text-rose-deep">{copy.locked.message}</p>
      <Link
        to="/owner"
        className="mt-16 inline-flex min-h-11 items-center px-3 text-small text-ink-soft underline decoration-line underline-offset-4 hover:text-ink"
      >
        {copy.locked.ownerLink}
      </Link>
    </BareLayout>
  )
}
