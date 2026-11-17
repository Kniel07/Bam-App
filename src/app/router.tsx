import { createBrowserRouter, Link } from 'react-router'
import { AppLayout } from '@/app/layouts/AppLayout'
import { RequireMember, RequireOwner } from '@/features/auth/guards'
import { KeyLanding } from '@/features/auth/KeyLanding'
import { HomePage } from '@/features/home/HomePage'
import { EmptyState } from '@/components/ui/States'
import { KEY_ROUTE } from '@/lib/constants'
import { setNavigationPendingProbe } from '@/lib/history/backStack'

function NotFoundPage() {
  return (
    <EmptyState
      title="This corner of the universe doesn't exist"
      action={
        <Link to="/" className="font-semibold text-rose-deep underline underline-offset-4">
          Go home
        </Link>
      }
    />
  )
}

/**
 * Route map (PAGE-STRUCTURE §1–2). Feature pages are lazy-loaded so the first
 * load stays within the performance budget (ARCHITECTURE §8).
 */
export const router = createBrowserRouter([
  { path: KEY_ROUTE, element: <KeyLanding /> },
  // Owner-only screens are split out so the partner's phone never downloads them.
  { path: '/owner', lazy: async () => ({ Component: (await import('@/features/auth/OwnerSignIn')).OwnerSignIn }) },
  {
    element: <RequireMember />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'letters', lazy: async () => ({ Component: (await import('@/features/letters/LettersPage')).LettersPage }) },
          {
            path: 'letters/:letterId',
            lazy: async () => ({ Component: (await import('@/features/letters/LetterReadingPage')).LetterReadingPage }),
          },
          { path: 'memories', lazy: async () => ({ Component: (await import('@/features/memories/MemoriesPage')).MemoriesPage }) },
          {
            path: 'memories/:memoryId',
            lazy: async () => ({ Component: (await import('@/features/memories/MemoryDetailPage')).MemoryDetailPage }),
          },
          { path: 'together', lazy: async () => ({ Component: (await import('@/features/together/TogetherPage')).TogetherPage }) },
          { path: 'story', lazy: async () => ({ Component: (await import('@/features/story/StoryPage')).StoryPage }) },
          {
            element: <RequireOwner />,
            children: [
              { path: 'settings', lazy: async () => ({ Component: (await import('@/features/settings/SettingsPage')).SettingsPage }) },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])

// Lets sheets closed by a link tap leave the navigation alone (lib/history/backStack).
setNavigationPendingProbe(() => router.state.navigation.state !== 'idle')
