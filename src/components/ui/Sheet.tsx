import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

export interface SheetProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/**
 * Bottom sheet on mobile, centred dialog from 768 px (COMPONENT-SPECIFICATION §1).
 * Built on the native <dialog>: focus trapping, Esc to close, and focus restore
 * come from the browser.
 */
export function Sheet({ isOpen, onClose, title, children }: SheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen && !dialog.open) dialog.showModal()
    if (!isOpen && dialog.open) dialog.close()
  }, [isOpen])

  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose() // backdrop tap
      }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-lg bg-surface p-0 text-ink shadow-sheet backdrop:bg-ink/30 md:inset-auto md:top-1/2 md:left-1/2 md:max-w-[560px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg"
    >
      <div className="px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
        <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-line md:hidden" />
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-h2">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-blush"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
