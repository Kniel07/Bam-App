import { RouterProvider } from 'react-router'
import { BareLayout } from '@/app/layouts/BareLayout'
import { QueryProvider } from '@/app/providers/QueryProvider'
import { router } from '@/app/router'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { copy } from '@/lib/copy'

export function App() {
  if (!isSupabaseConfigured) {
    return (
      <BareLayout>
        <p role="alert" className="text-h3">
          {copy.config.missing}
        </p>
      </BareLayout>
    )
  }

  return (
    <QueryProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryProvider>
  )
}
