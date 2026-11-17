import { useEffect, useState } from 'react'
import { Bell, BellOff, Download, Share } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { disablePush, enablePush, getPushStatus, PushError, type PushStatus } from '@/lib/notifications/push'
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

  async function toggle(turnOn: boolean) {
    setIsWorking(true)
    setError(null)
    try {
      setStatus(turnOn ? await enablePush() : await disablePush())
    } catch (caught) {
      setError(caught instanceof PushError ? caught.message : copy.errors.generic)
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
        </section>
      </div>
    </Sheet>
  )
}
