import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { Sparkles } from 'lucide-react'
import { MoreSheet } from '@/components/navigation/MoreSheet'
import { PRIMARY_NAV } from '@/components/navigation/navItems'
import { Sparkle } from '@/components/shared/Decorations'
import { copy } from '@/lib/copy'

const linkBase = 'flex items-center justify-center rounded-md font-semibold transition-colors'

/** Member area shell: bottom tab bar on mobile, top bar from 1024 px (RESPONSIVE §2). */
export function AppLayout() {
  const [isMoreOpen, setIsMoreOpen] = useState(false)

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 hidden border-b border-line/60 bg-cream/90 backdrop-blur lg:block">
        <nav aria-label="Main" className="mx-auto flex h-16 max-w-[1120px] items-center gap-8 px-8">
          <NavLink to="/" className="flex items-center gap-2 font-display text-h3 text-ink">
            {copy.appName}
            <Sparkle className="size-3 text-rose" />
          </NavLink>
          <ul className="flex flex-1 items-center gap-2">
            {PRIMARY_NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `${linkBase} min-h-11 px-4 ${isActive ? 'bg-blush text-rose-deep' : 'text-ink-soft hover:text-ink'}`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setIsMoreOpen(true)} className={`${linkBase} min-h-11 gap-2 px-4 text-ink-soft hover:text-ink`}>
            <Sparkles aria-hidden className="size-5" /> More
          </button>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1120px] px-5 pb-28 pt-6 md:px-8 lg:pb-16">
        <Outlet />
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line/60 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto flex h-16 max-w-md items-stretch justify-around">
          {PRIMARY_NAV.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex h-full flex-col items-center justify-center gap-0.5 text-micro font-bold tracking-wide ${isActive ? 'text-rose-deep' : 'text-ink-soft'}`
                }
              >
                <Icon aria-hidden className="size-6" strokeWidth={1.75} />
                {label}
              </NavLink>
            </li>
          ))}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setIsMoreOpen(true)}
              className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-micro font-bold tracking-wide text-ink-soft"
            >
              <Sparkles aria-hidden className="size-6" strokeWidth={1.75} />
              More
            </button>
          </li>
        </ul>
      </nav>

      <MoreSheet isOpen={isMoreOpen} onClose={() => setIsMoreOpen(false)} />
    </div>
  )
}
