import { useEffect, useState } from 'react'
import { Bell, BellOff, BellRing, Download, Share } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import {
  disablePush,
  enablePush,
  getPushStatus,
  PushError,
  sendTestNotification,
  type PushStatus,
  type TestResult,
} from '@/lib/notifications/push'
import { useInstallPrompt } from '@/lib/notifications/useInstallPrompt'
import { copy } from '@/lib/copy'

const STATUS_TEXT: Record<PushStatus, string> = {
  on: 'Notifications are on for this phone.',
  off: 'Get a little note when a letter unlocks for you and when our monthsary begins.',
  blocked: 'Notifications are blocked. Allow them in your phone settings for this app, then come back here.',
  unsupported: 'This browser can’t show notifications. Open the site in Chrome to turn them on.',
  'needs-install': 'On iPhone, notifications work only in the installed app. Install it first (below).',
  'not-configured': 'Notifications aren’t set up on the site yet.',
}

const TEST_TEXT: Record<TestResult['kind'], string> = {
  sent: 'Sent! It should appear within a few seconds. Lock the phone to see it on the lock screen.',
  queued: 'Requested. It should arrive within a minute.',
  'too-soon': 'A test was just sent. Wait 30 seconds before trying again.',
  'no-device': 'This phone isn’t registered on the server. Turn notifications off and on again here.',
  'key-mismatch': 'The notification keys don’t match: the public key in Vercel must be the same as VAPID_PUBLIC_KEY in Supabase (SETUP-GUIDE Part F).',
  'server-not-configured': 'The notification server isn’t fully set up',
  'push-failed': 'The push service refused the notification',
}

function describeTest(result: TestResult): string {
  if (result.kind === 'server-not-configured') return `${TEST_TEXT[result.kind]}: ${result.reason}.`
  if (result.kind === 'push-failed') return `${TEST_TEXT[result.kind]} (status ${result.statuses.join(', ')}).`
  return TEST_TEXT[result.kind]
}

/**
 * Readable failure text for this sheet. Shows the underlying reason (e.g.
 * "Could not find the function public.request_test_notification"): these are
 * server or browser messages that never contain keys, and they make problems
 * diagnosable instead of a generic "lost in space".
 */
function describeError(caught: unknown): string {
  if (caught instanceof PushError) {
    const cause = caught.cause as { message?: string; code?: string } | undefined
    const detail = cause?.message ? ` (${cause.code ? `${cause.code}: ` : ''}${cause.message})` : ''
    return `${caught.message}${detail}`
  }
  if (caught instanceof Error && caught.message) return `${copy.errors.generic} (${caught.name}: ${caught.message})`
  return copy.errors.generic
}

function InstallSection() {
  const { state, install } = useInstallPrompt()
  if (state === 'installed') return <p className="text-small text-success">The app is installed on this phone.</p>
  if (state === 'available') {
    return (
      <Button variant="secondary" iconLeft={<Download aria-hidden className="size-5" />} onClick={() => void install()}>
        Install the app
      </Button>
    )
  }
  if (state === 'ios-manual') {
    return (
      <p className="flex items-start gap-2 text-small text-ink-soft">
        <Share aria-hidden className="mt-0.5 size-4 shrink-0" />
        In Safari, tap Share, then “Add to Home Screen”.
      </p>
    )
  }
  return <p className="text-small text-ink-soft">In Chrome, open the ⋮ menu and choose “Install app” or “Add to Home screen”.</p>
}

/** More → Notifications (CR-04): install the app and turn phone notifications on or off. */
export function NotificationsSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [status, setStatus] = useState<PushStatus | null>(null)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testMessage, setTestMessage] = useState<string | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    let isActive = true
    void getPushStatus().then((next) => {
      if (isActive) setStatus(next)
    })
    return () => {
      isActive = false
    }
  }, [isOpen])

  async function runTest() {
    setIsTesting(true)
    setTestMessage(null)
    try {
      setTestMessage(describeTest(await sendTestNotification()))
    } catch (caught) {
      setTestMessage(describeError(caught))
    } finally {
      setIsTesting(false)
    }
  }

  async function toggle(turnOn: boolean) {
    setIsWorking(true)
    setError(null)
    try {
      setStatus(turnOn ? await enablePush() : await disablePush())
    } catch (caught) {
      setError(describeError(caught))
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Notifications">
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <h3 className="text-h3">The app</h3>
          <InstallSection />
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-h3">Phone notifications</h3>
          <p className="text-body text-ink-soft">{status ? STATUS_TEXT[status] : 'Checking this phone…'}</p>
          {status === 'off' && (
            <Button iconLeft={<Bell aria-hidden className="size-5" />} isLoading={isWorking} onClick={() => void toggle(true)}>
              Turn on notifications
            </Button>
          )}
          {status === 'on' && (
            <Button iconLeft={<BellRing aria-hidden className="size-5" />} isLoading={isTesting} onClick={() => void runTest()}>
              Send me a test notification
            </Button>
          )}
          {testMessage && (
            <p role="status" className="rounded-sm bg-blush px-4 py-3 text-small text-rose-deep">
              {testMessage}
            </p>
          )}
          {status === 'on' && (
            <Button
              variant="secondary"
              iconLeft={<BellOff aria-hidden className="size-5" />}
              isLoading={isWorking}
              onClick={() => void toggle(false)}
            >
              Turn off on this phone
            </Button>
          )}
          {error && (
            <p role="alert" className="text-small text-error">
              {error}
            </p>
          )}
          <p className="text-small text-ink-soft">
            Notifications never show what a letter says, only that something is waiting.
          </p>
          <details className="text-small text-ink-soft">
            <summary className="min-h-11 cursor-pointer py-2 font-semibold text-rose-deep">Not receiving them?</summary>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Phone Settings → Apps → this app (and Chrome) → Notifications: allowed.</li>
              <li>Battery → Unrestricted (Samsung: also remove it from “Sleeping apps”).</li>
              <li>Do Not Disturb off.</li>
              <li>Turn notifications off and on here once, then send a test.</li>
            </ul>
          </details>
        </section>
      </div>
    </Sheet>
  )
}
