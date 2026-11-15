import { useId } from 'react'

interface ToggleProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

/** Accessible switch (role="switch"), 44 px tall hit area. */
export function Toggle({ label, description, checked, onChange }: ToggleProps) {
  const id = useId()
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-small font-semibold text-ink">
          {label}
        </label>
        {description && <p className="text-small text-ink-soft">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-[var(--duration-fast)] ${checked ? 'bg-rose-deep' : 'bg-line'}`}
      >
        <span
          aria-hidden
          className={`absolute top-1 left-1 size-5 rounded-full bg-white shadow-soft transition-transform duration-[var(--duration-fast)] ${checked ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  )
}
