import { Sparkle } from '@/components/shared/Decorations'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { useRole } from '@/features/auth/useAuth'
import { MonthsaryCounter } from '@/features/monthsary/MonthsaryCounter'
import { NextMonthsaryPill } from '@/features/monthsary/NextMonthsaryPill'
import { useCurrentMember, useNames, useRelationship } from '@/features/relationship/hooks'
import { WelcomeEnvelope } from '@/features/welcome/WelcomeEnvelope'
import { useMilestones } from '@/features/story/hooks'
import { CornerCard } from './CornerCard'
import { WaitingForYou } from './WaitingForYou'
import { NudgePad } from '@/features/nudges/NudgePad'
import { TogetherSummary } from './TogetherSummary'
import { FeaturedStrip } from './FeaturedStrip'
import { useLetters } from '@/features/letters/hooks'
import { useUnreadLetters } from '@/features/letters/useUnreadLetters'
import { copy } from '@/lib/copy'
import { useNow } from '@/lib/time/useNow'
import { staggerStyle } from '@/lib/stagger'

/** "Our Universe" — the heart of the app (PAGE-STRUCTURE §4.4). */
export function HomePage() {
  const relationship = useRelationship()
  const role = useRole()
  const currentMember = useCurrentMember()
  const names = useNames()
  const now = useNow()
  const milestones = useMilestones()
  const letters = useLetters()
  const unreadLetters = useUnreadLetters()
  const latestMilestone = milestones.data?.filter((milestone) => milestone.status === 'published').at(-1)

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
        <div className="animate-rise-in">
          <MonthsaryCounter
            startAt={new Date(relationship.data.start_at)}
            timeZone={relationship.data.timezone}
            message={relationship.data.counter_message}
            now={now}
          />
          <NextMonthsaryPill startAt={new Date(relationship.data.start_at)} timeZone={relationship.data.timezone} now={now} />
        </div>
      )}

      {relationship.data && (
        <div className="animate-rise-in" style={staggerStyle(1)}>
          <FeaturedStrip />
        </div>
      )}

      {relationship.data && (
        <div className="animate-rise-in" style={staggerStyle(1)}>
          <NudgePad />
        </div>
      )}

      {relationship.data && (
        <div className="animate-rise-in" style={staggerStyle(1)}>
          <TogetherSummary />
        </div>
      )}

      {unreadLetters.length > 0 && (
        <div className="animate-rise-in" style={staggerStyle(1)}>
          <WaitingForYou letters={unreadLetters} />
        </div>
      )}

      {relationship.data && (
        <section aria-labelledby="corners-heading" className="flex animate-rise-in flex-col gap-3" style={staggerStyle(2)}>
          <h2 id="corners-heading" className="font-sans text-micro font-bold uppercase tracking-[0.06em] text-ink-soft">
            Corners of our universe
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <CornerCard to="/story" title="Our Story">
              {latestMilestone ? `Latest: ${latestMilestone.title}` : 'Where it all began.'}
            </CornerCard>
            <CornerCard to="/memories" title="Our Memories">
              A scrapbook that keeps growing.
            </CornerCard>
            <CornerCard to="/letters" title="Letters">
              {unreadLetters.length > 0
                ? `${unreadLetters.length} waiting for you`
                : letters.data?.length
                  ? `${letters.data.length} envelope${letters.data.length === 1 ? '' : 's'}`
                  : 'Little envelopes for little moments.'}
            </CornerCard>
          </div>
        </section>
      )}

      {showWelcome && relationship.data && (
        <WelcomeEnvelope message={relationship.data.welcome_message} signature={names.owner} />
      )}
    </div>
  )
}
