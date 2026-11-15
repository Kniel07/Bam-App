import { BareLayout } from '@/app/layouts/BareLayout'
import { WaxSeal } from '@/components/shared/Decorations'
import { copy } from '@/lib/copy'

/** Shown to anyone without a member session. Reveals nothing personal (FR-AUTH-04). */
export function LockedScreen() {
  return (
    <BareLayout>
      <WaxSeal className="mx-auto mb-8 size-20 drop-shadow-[0_8px_24px_rgb(156_69_96/0.18)]" />
      <h1 className="text-h1">{copy.locked.title}</h1>
      <p className="mt-3 font-hand text-hand-lg text-rose-deep">{copy.locked.message}</p>
    </BareLayout>
  )
}
