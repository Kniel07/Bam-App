import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { BareLayout } from '@/app/layouts/BareLayout'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { supabase } from '@/lib/supabase/client'
import { copy } from '@/lib/copy'
import { useAuth } from './useAuth'

/** Owner email + password sign-in at /owner (FR-AUTH-10). Not linked from partner UI. */
export function OwnerSignIn() {
  const navigate = useNavigate()
  const { auth } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  if (auth.status === 'member') return <Navigate to="/" replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setNotice(null)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setIsSubmitting(false)
    if (signInError) {
      setError(signInError.status !== undefined && signInError.status < 500 ? copy.ownerSignIn.failed : copy.errors.generic)
      return
    }
    navigate('/', { replace: true })
  }

  async function handleForgotPassword() {
    setError(null)
    if (!email.trim()) {
      setNotice(copy.ownerSignIn.resetNeedsEmail)
      return
    }
    await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/owner` })
    // Same message whether or not the address exists (no account enumeration).
    setNotice(copy.ownerSignIn.resetSent)
  }

  return (
    <BareLayout>
      <form onSubmit={handleSubmit} className="rounded-lg bg-surface p-6 text-left shadow-soft" noValidate>
        <h1 className="mb-6 text-center text-h2">{copy.ownerSignIn.title}</h1>
        <div className="flex flex-col gap-4">
          <TextField
            label={copy.ownerSignIn.email}
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <TextField
            label={copy.ownerSignIn.password}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        {error && (
          <p role="alert" className="mt-4 text-small text-error">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-4 text-small text-ink-soft">
            {notice}
          </p>
        )}
        <Button type="submit" className="mt-6 w-full" isLoading={isSubmitting} disabled={!email || !password}>
          {copy.ownerSignIn.submit}
        </Button>
        <button
          type="button"
          onClick={() => void handleForgotPassword()}
          className="mt-4 block w-full min-h-11 text-center text-small font-semibold text-rose-deep"
        >
          {copy.ownerSignIn.forgot}
        </button>
      </form>
    </BareLayout>
  )
}
