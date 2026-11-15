import { Plus } from 'lucide-react'

/** Floating add button above the bottom nav; a header-style button on desktop (RESPONSIVE §2). */
export function Fab({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="fixed right-5 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 grid size-14 place-items-center rounded-full bg-rose-deep text-white shadow-lift transition active:scale-95 lg:static lg:inline-flex lg:size-auto lg:min-h-11 lg:gap-2 lg:rounded-md lg:px-5 lg:font-semibold"
    >
      <Plus aria-hidden className="size-6 lg:size-5" />
      <span className="hidden lg:inline">{label}</span>
    </button>
  )
}
