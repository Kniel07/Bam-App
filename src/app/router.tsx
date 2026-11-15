import { createBrowserRouter, Link } from 'react-router'
import { AppLayout } from '@/app/layouts/AppLayout'
import { RequireMember, RequireOwner } from '@/features/auth/guards'
import { KeyLanding } from '@/features/auth/KeyLanding'
import { HomePage } from '@/features/home/HomePage'
import { EmptyState } from '@/components/ui/States'
import { KEY_ROUTE } from '@/lib/constants'

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

/** Route map (PAGE-STRUCTURE §1–2). Feature routes are added per build slice. */
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
