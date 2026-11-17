import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PushError } from '@/lib/notifications/push'
import { NotificationsSheet } from './NotificationsSheet'

let testOutcome: () => Promise<unknown> = () => Promise.resolve({ kind: 'sent' })

vi.mock('@/lib/notifications/push', async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal()
  return {
    ...actual,
    getPushStatus: () => Promise.resolve('on'),
    sendTestNotification: () => testOutcome(),
    enablePush: () => Promise.resolve('on'),
    disablePush: () => Promise.resolve('off'),
  }
})
vi.mock('@/lib/notifications/useInstallPrompt', () => ({ useInstallPrompt: () => ({ state: 'installed', install: vi.fn() }) }))

describe('NotificationsSheet diagnostics', () => {
  it('shows the real reason when the test request fails (e.g. migration missing)', async () => {
    testOutcome = () =>
      Promise.reject(
        new PushError('Could not request a test notification', {
          code: 'PGRST202',
          message: 'Could not find the function public.request_test_notification without parameters in the schema cache',
        }),
      )
    render(<NotificationsSheet isOpen onClose={vi.fn()} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Send me a test notification' }))
    expect(await screen.findByText(/PGRST202: Could not find the function public.request_test_notification/)).toBeInTheDocument()
  })

  it('reports success in plain words', async () => {
    testOutcome = () => Promise.resolve({ kind: 'sent' })
    render(<NotificationsSheet isOpen onClose={vi.fn()} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Send me a test notification' }))
    expect(await screen.findByText(/Sent! It should appear within a few seconds/)).toBeInTheDocument()
  })
})
