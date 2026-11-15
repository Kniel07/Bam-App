import { Sparkle } from '@/components/shared/Decorations'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { useRole } from '@/features/auth/useAuth'
import { MonthsaryCounter } from '@/features/monthsary/MonthsaryCounter'
import { NextMonthsaryPill } from '@/features/monthsary/NextMonthsaryPill'
import { useCurrentMember, useNames, useRelationship } from '@/features/relationship/hooks'
import { WelcomeEnvelope } from '@/features/welcome/WelcomeEnvelope'
import { copy } from '@/lib/copy'
import { useNow } from '@/lib/time/useNow'

/** "Our Universe" — the heart of the app (PAGE-STRUCTURE §4.4). */
export function HomePage() {
  const relationship = useRelationship()
  const role = useRole()
  const currentMember = useCurrentMember()
  const names = useNames()
  const now = useNow()

  const showWelcome =
    role === 'partner' &&
    currentMember !== undefined &&
    currentMember.welcomedAt === null &&
    Boolean(relationship.data?.welcome_message)

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center gap-2 lg:hidden">
        <h1 className="text-h2">{copy.appName}</h1>
        <Sparkle className="size-3 text-rose" />
      </header>

      {relationship.isPending ? (
        <Skeleton className="h-64 rounded-lg" />
      ) : relationship.isError ? (
        <ErrorState onRetry={() => void relationship.refetch()} />
      ) : !relationship.data ? (
        <EmptyState
          title="Our universe isn't set up yet"
          message={role === 'owner' ? 'Finish provisioning (see INSTALLATION) to add our beginning.' : undefined}
        />
      ) : (
        <div>
          <MonthsaryCounter
            startAt={new Date(relationship.data.start_at)}
            timeZone={relationship.data.timezone}
            message={relationship.data.counter_message}
            now={now}
          />
          <NextMonthsaryPill startAt={new Date(relationship.data.start_at)} timeZone={relationship.data.timezone} now={now} />
        </div>
      )}

      {showWelcome && relationship.data && (
        <WelcomeEnvelope message={relationship.data.welcome_message} signature={names.owner} />
      )}
    </div>
  )
}
