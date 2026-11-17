import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { useAuth, useRole } from '@/features/auth/useAuth'
import { formatCountdown } from '@/features/monthsary/formatCountdown'
import { useNames } from '@/features/relationship/hooks'
import { upcomingCountdowns } from '@/features/together/Countdowns'
import { useCountdowns, useRecentMoods } from '@/features/together/hooks'
import { moodInfo } from '@/features/together/moods'
import { useNow } from '@/lib/time/useNow'

/** Home glance at Together: their latest mood and the next countdown. */
export function TogetherSummary() {
  const { auth } = useAuth()
  const role = useRole()
  const names = useNames()
  const now = useNow()
  const moods = useRecentMoods()
  const countdowns = useCountdowns()
  const myUserId = auth.status === 'member' ? auth.userId : null
  const otherName = role === 'owner' ? names.partner : names.owner
  const theirMood = moods.data?.find((mood) => mood.user_id !== myUserId)
  const next = upcomingCountdowns(countdowns.data, now)[0]

  return (
    <Link to="/together" className="flex items-center gap-3 rounded-md bg-surface px-4 py-3 shadow-soft transition active:scale-[0.98]">
      <div className="min-w-0 flex-1 text-small">
        <p className="truncate text-ink">
          {theirMood ? (
            <>
              {moodInfo(theirMood.mood).emoji} {otherName} is feeling <span className="font-semibold">{moodInfo(theirMood.mood).label}</span>
            </>
          ) : (
            <>🌤️ How are you both feeling today?</>
          )}
        </p>
        {next && (
          <p className="truncate text-rose-deep">
            ⏳ {next.title} · {formatCountdown(new Date(next.target_at), now)}
          </p>
        )}
      </div>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-rose" />
    </Link>
  )
}
