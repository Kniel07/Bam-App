import { useId, type TextareaHTMLAttributes } from 'react'

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
  error?: string
}

export function TextArea({ label, hint, error, id, className = '', rows = 4, maxLength, value, ...rest }: TextAreaProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const length = typeof value === 'string' ? value.length : 0

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={inputId} className="text-small font-semibold text-ink">
        {label}
      </label>
      <textarea
        id={inputId}
        rows={rows}
        maxLength={maxLength}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${inputId}-help` : undefined}
        className={`rounded-sm border bg-surface px-4 py-3 text-body text-ink outline-none transition focus:border-rose-deep focus:ring-2 focus:ring-rose-deep/20 ${error ? 'border-error' : 'border-line'}`}
        {...rest}
      />
      <div id={`${inputId}-help`} className="flex justify-between gap-4 text-small">
        <span className={error ? 'text-error' : 'text-ink-soft'}>{error ?? hint}</span>
        {maxLength !== undefined && (
          <span className="shrink-0 tabular-nums text-ink-soft">
            {length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  )
}
