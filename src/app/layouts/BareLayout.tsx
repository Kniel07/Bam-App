import type { ReactNode } from 'react'
import { Sparkle } from '@/components/shared/Decorations'

/** Centered, chrome-free layout for the locked, key, and owner sign-in screens. */
export function BareLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative grid min-h-dvh place-items-center px-5 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <Sparkle className="absolute left-[18%] top-[16%] size-3 text-rose" />
      <Sparkle className="absolute right-[20%] top-[26%] size-2.5 text-lavender-deep/40" />
      <Sparkle className="absolute bottom-[18%] right-[28%] size-3.5 text-rose" />
      <div className="w-full max-w-sm text-center">{children}</div>
    </main>
  )
}
