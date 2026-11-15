import { useId, type InputHTMLAttributes } from 'react'

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

/** Labelled input; labels are always visible (never placeholder-only). */
export function TextField({ label, error, hint, id, className = '', ...rest }: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={inputId} className="text-small font-semibold text-ink">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`min-h-12 rounded-sm border bg-surface px-4 text-body text-ink outline-none transition focus:border-rose-deep focus:ring-2 focus:ring-rose-deep/20 ${error ? 'border-error' : 'border-line'}`}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-small text-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-small text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
