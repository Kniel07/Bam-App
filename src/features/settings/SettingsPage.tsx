import { useState, type FormEvent, type ReactNode } from 'react'
import { KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { TextArea } from '@/components/ui/TextArea'
import { TextField } from '@/components/ui/TextField'
import type { Member, Relationship } from '@/features/relationship/api'
import {
  useMembers,
  useRelationship,
  useUpdateDisplayNames,
  useUpdateRelationship,
} from '@/features/relationship/hooks'
import { getNextMonthsary, instantToZonedWallTime, zonedWallTimeToInstant } from '@/lib/dates/monthsary'
import { copy } from '@/lib/copy'

const TIMEZONES: readonly string[] = Intl.supportedValuesOf('timeZone')

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-5 md:p-6">
      <h2 className="mb-4 text-h2">{title}</h2>
      {children}
    </Card>
  )
}

type SaveState = { kind: 'idle' } | { kind: 'saved' } | { kind: 'error'; message: string }

function SaveStatus({ state }: { state: SaveState }) {
  if (state.kind === 'saved') return <p role="status" className="text-small text-success">Saved.</p>
  if (state.kind === 'error') return <p role="alert" className="text-small text-error">{state.message}</p>
  return null
}

function BeginningForm({ relationship }: { relationship: Relationship }) {
  const initial = instantToZonedWallTime(new Date(relationship.start_at), relationship.timezone)
  const [date, setDate] = useState(initial.date)
  const [time, setTime] = useState(initial.time)
  const [timeZone, setTimeZone] = useState(relationship.timezone)
  const [saveState, setSaveState] = useState<SaveState>({ kind: 'idle' })
  const update = useUpdateRelationship()

  const isTimeZoneValid = TIMEZONES.includes(timeZone)
  let preview: string | null = null
  if (isTimeZoneValid && date && time) {
    const startAt = zonedWallTimeToInstant(date, time, timeZone)
    const next = getNextMonthsary(startAt, new Date(), timeZone)
    const formatted = new Intl.DateTimeFormat(undefined, { timeZone, dateStyle: 'long', timeStyle: 'short' }).format(next.at)
    preview = `Next monthsary: #${next.number} on ${formatted}`
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isTimeZoneValid) return
    const isChanged = date !== initial.date || time !== initial.time || timeZone !== relationship.timezone
    if (isChanged && !window.confirm('This changes every monthsary and the counter. Continue?')) return
    setSaveState({ kind: 'idle' })
    try {
      await update.mutateAsync({
        id: relationship.id,
        update: { start_at: zonedWallTimeToInstant(date, time, timeZone).toISOString(), timezone: timeZone },
      })
      setSaveState({ kind: 'saved' })
    } catch {
      setSaveState({ kind: 'error', message: copy.errors.generic })
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        <TextField label="Time" type="time" value={time} onChange={(event) => setTime(event.target.value)} required />
      </div>
      <TextField
        label="Timezone"
        list="timezone-options"
        value={timeZone}
        onChange={(event) => setTimeZone(event.target.value)}
        error={isTimeZoneValid ? undefined : 'Choose a timezone from the list (Region/City).'}
        hint="Monthsaries and unlocks happen at this time, in this timezone."
        autoComplete="off"
        required
      />
      <datalist id="timezone-options">
        {TIMEZONES.map((zone) => (
          <option key={zone} value={zone} />
        ))}
      </datalist>
      {preview && <p className="rounded-sm bg-blush px-4 py-3 text-small text-rose-deep">{preview}</p>}
      <div className="flex items-center gap-4">
        <Button type="submit" isLoading={update.isPending} disabled={!isTimeZoneValid}>
          Save beginning
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}

function NamesForm({ members }: { members: Member[] }) {
  const owner = members.find((member) => member.role === 'owner')
  const partner = members.find((member) => member.role === 'partner')
  const [ownerName, setOwnerName] = useState(owner?.displayName ?? '')
  const [partnerName, setPartnerName] = useState(partner?.displayName ?? '')
  const [saveState, setSaveState] = useState<SaveState>({ kind: 'idle' })
  const update = useUpdateDisplayNames()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaveState({ kind: 'idle' })
    const changes = [
      owner ? { userId: owner.userId, displayName: ownerName.trim() } : null,
      partner ? { userId: partner.userId, displayName: partnerName.trim() } : null,
    ].filter((change): change is { userId: string; displayName: string } => change !== null)
    try {
      await update.mutateAsync(changes)
      setSaveState({ kind: 'saved' })
    } catch {
      setSaveState({ kind: 'error', message: copy.errors.generic })
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <TextField label="Your name" value={ownerName} maxLength={40} onChange={(event) => setOwnerName(event.target.value)} disabled={!owner} />
      <TextField
        label="Her name"
        value={partnerName}
        maxLength={40}
        onChange={(event) => setPartnerName(event.target.value)}
        disabled={!partner}
        hint={partner ? undefined : 'Appears once her account is provisioned.'}
      />
      <div className="flex items-center gap-4">
        <Button type="submit" isLoading={update.isPending}>
          Save names
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}

function WordsForm({ relationship }: { relationship: Relationship }) {
  const [counterMessage, setCounterMessage] = useState(relationship.counter_message)
  const [welcomeMessage, setWelcomeMessage] = useState(relationship.welcome_message)
  const [introStory, setIntroStory] = useState(relationship.intro_story)
  const [saveState, setSaveState] = useState<SaveState>({ kind: 'idle' })
  const update = useUpdateRelationship()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaveState({ kind: 'idle' })
    try {
      await update.mutateAsync({
        id: relationship.id,
        update: { counter_message: counterMessage.trim(), welcome_message: welcomeMessage.trim(), intro_story: introStory.trim() },
      })
      setSaveState({ kind: 'saved' })
    } catch {
      setSaveState({ kind: 'error', message: copy.errors.generic })
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <TextArea
        label="Counter message"
        rows={2}
        maxLength={200}
        value={counterMessage}
        onChange={(event) => setCounterMessage(event.target.value)}
        hint="Shown under the counter on Home."
      />
      <TextArea
        label="Welcome letter"
        rows={6}
        maxLength={5000}
        value={welcomeMessage}
        onChange={(event) => setWelcomeMessage(event.target.value)}
        hint="Opens once, in an envelope, the first time she comes in."
      />
      <TextArea
        label="Our story introduction"
        rows={5}
        maxLength={5000}
        value={introStory}
        onChange={(event) => setIntroStory(event.target.value)}
        hint="The opening words of Our Story."
      />
      <div className="flex items-center gap-4">
        <Button type="submit" isLoading={update.isPending}>
          Save words
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}

function PartnerKeyInfo({ partner }: { partner: Member | undefined }) {
  return (
    <div className="flex gap-3 text-small text-ink-soft">
      <KeyRound aria-hidden className="mt-0.5 size-5 shrink-0 text-lavender-deep" />
      <div className="flex flex-col gap-2">
        <p>{partner ? 'Her key is active.' : 'Her account has not been provisioned yet.'}</p>
        <p>
          To issue a new key (lost or shared card), run <code className="rounded bg-lavender-mist px-1.5 py-0.5 text-ink">npm run partner-key -- rotate</code>{' '}
          on your computer. The old card stops working immediately and her current sessions end.
        </p>
      </div>
    </div>
  )
}

/** Owner settings (PAGE-STRUCTURE §4.12, FR-SET-01/02/05). */
export function SettingsPage() {
  const relationship = useRelationship()
  const members = useMembers()

  if (relationship.isPending || members.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-72" />
      </div>
    )
  }
  if (relationship.isError || members.isError) {
    return <ErrorState onRetry={() => void Promise.all([relationship.refetch(), members.refetch()])} />
  }

  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-6">
      <h1 className="text-h1">Settings</h1>
      {relationship.data ? (
        <>
          <SettingsSection title="Our beginning">
            <BeginningForm relationship={relationship.data} />
          </SettingsSection>
          <SettingsSection title="Names">
            <NamesForm members={members.data} />
          </SettingsSection>
          <SettingsSection title="Words">
            <WordsForm relationship={relationship.data} />
          </SettingsSection>
        </>
      ) : (
        <EmptyState title="Not provisioned yet" message="Run the provisioning step (supabase/provisioning.example.sql) first." />
      )}
      <SettingsSection title="Her key">
        <PartnerKeyInfo partner={members.data.find((member) => member.role === 'partner')} />
      </SettingsSection>
    </div>
  )
}
