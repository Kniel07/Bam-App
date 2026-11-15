import { useState } from 'react'
import { Link } from 'react-router'
import { LogOut, Settings } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { useAuth, useRole } from '@/features/auth/useAuth'
import { copy } from '@/lib/copy'

export function MoreSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const role = useRole()
  const { signOut } = useAuth()
  const [isConfirmingSignOut, setIsConfirmingSignOut] = useState(false)

  const close = () => {
    setIsConfirmingSignOut(false)
    onClose()
  }

  return (
    <Sheet isOpen={isOpen} onClose={close} title="More">
      {isConfirmingSignOut ? (
        <div className="flex flex-col gap-4">
          <p className="text-body">{role === 'partner' ? copy.signOut.partnerConfirm : copy.signOut.ownerConfirm}</p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setIsConfirmingSignOut(false)}>
              {copy.signOut.cancel}
            </Button>
            <Button variant="danger" className="flex-1" onClick={() => void signOut()}>
              {copy.signOut.label}
            </Button>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {role === 'owner' && (
            <li>
              <Link to="/settings" onClick={close} className="flex min-h-12 items-center gap-3 rounded-sm px-3 hover:bg-blush">
                <Settings aria-hidden className="size-5 text-lavender-deep" />
                Settings
              </Link>
            </li>
          )}
          <li>
            <button
              type="button"
              onClick={() => setIsConfirmingSignOut(true)}
              className="flex min-h-12 w-full items-center gap-3 rounded-sm px-3 text-left text-ink-soft hover:bg-blush"
            >
              <LogOut aria-hidden className="size-5" />
              {copy.signOut.label}
            </button>
          </li>
        </ul>
      )}
    </Sheet>
  )
}
