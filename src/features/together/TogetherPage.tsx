import { Countdowns } from './Countdowns'
import { MoodCheckIn } from './MoodCheckIn'

/**
 * Together (CR-06): small shared activities. Batch A: mood check-in and
 * countdowns (nudges, hold-to-hug and same-moment magic live on Home).
 * Later batches add Question of the day, Reasons jar, Someday list, Quiz.
 */
export function TogetherPage() {
  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-6">
      <header>
        <h1 className="text-h1">Together</h1>
        <p className="font-hand text-hand text-rose-deep">Little things we share, wherever we are.</p>
      </header>
      <div className="animate-rise-in">
        <MoodCheckIn />
      </div>
      <div className="animate-rise-in" style={{ animationDelay: '60ms' }}>
        <Countdowns />
      </div>
    </div>
  )
}
