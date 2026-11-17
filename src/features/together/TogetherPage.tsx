import { Countdowns } from './Countdowns'
import { MoodCheckIn } from './MoodCheckIn'
import { QuestionOfTheDay } from './QuestionOfTheDay'
import { ReasonsJar } from './ReasonsJar'
import { staggerStyle } from '@/lib/stagger'

/**
 * Together (CR-06): small shared activities. Question of the day, Reasons
 * jar, mood check-in and countdowns (nudges, hold-to-hug and same-moment
 * magic live on Home). Batch C adds the Someday list and the quiz.
 */
export function TogetherPage() {
  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-6">
      <header>
        <h1 className="text-h1">Together</h1>
        <p className="font-hand text-hand text-rose-deep">Little things we share, wherever we are.</p>
      </header>
      <div className="animate-rise-in" style={staggerStyle(0)}>
        <QuestionOfTheDay />
      </div>
      <div className="animate-rise-in" style={staggerStyle(1)}>
        <ReasonsJar />
      </div>
      <div className="animate-rise-in" style={staggerStyle(2)}>
        <MoodCheckIn />
      </div>
      <div className="animate-rise-in" style={staggerStyle(3)}>
        <Countdowns />
      </div>
    </div>
  )
}
