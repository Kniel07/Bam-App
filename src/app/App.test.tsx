import { render, screen } from '@testing-library/react'
import { copy } from '@/lib/copy'

vi.mock('@/lib/supabase/client', () => ({ isSupabaseConfigured: false, supabase: {} }))

test('explains missing configuration instead of rendering a broken app', async () => {
  const { App } = await import('./App')
  render(<App />)
  expect(screen.getByRole('alert')).toHaveTextContent(copy.config.missing)
})
