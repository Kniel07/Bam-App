import { sendTestNotification } from './push'

const rpc = vi.fn()
const invoke = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args), functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}))

describe('sendTestNotification diagnostics', () => {
  beforeEach(() => {
    rpc.mockReset()
    invoke.mockReset()
    rpc.mockResolvedValue({ error: null })
  })

  it('reports success when the server sent it', async () => {
    invoke.mockResolvedValue({ data: { sent: 1, noDevice: 0, failedStatuses: [] }, error: null })
    expect(await sendTestNotification()).toEqual({ kind: 'sent' })
  })
  it('explains a VAPID key mismatch (push service 403)', async () => {
    invoke.mockResolvedValue({ data: { sent: 0, failedStatuses: [403] }, error: null })
    expect(await sendTestNotification()).toEqual({ kind: 'key-mismatch' })
  })
  it('explains an unregistered phone', async () => {
    invoke.mockResolvedValue({ data: { sent: 0, noDevice: 1, failedStatuses: [] }, error: null })
    expect(await sendTestNotification()).toEqual({ kind: 'no-device' })
  })
  it('surfaces the server reason, e.g. a missing secret', async () => {
    const context = { json: () => Promise.resolve({ error: 'notify failed', reason: 'Missing secret VAPID_SUBJECT' }) }
    invoke.mockResolvedValue({ data: null, error: { message: 'non-2xx', context } })
    expect(await sendTestNotification()).toEqual({ kind: 'server-not-configured', reason: 'Missing secret VAPID_SUBJECT' })
  })
  it('respects the 30-second limit', async () => {
    rpc.mockResolvedValue({ error: { message: 'test_too_soon' } })
    expect(await sendTestNotification()).toEqual({ kind: 'too-soon' })
    expect(invoke).not.toHaveBeenCalled()
  })
})
