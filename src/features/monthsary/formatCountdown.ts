const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * Human countdown: "in 3 days", "in 4 h 12 m", "in 7 minutes", "any moment now".
 * Uses elapsed real time; calendar precision isn't needed for a countdown label.
 */
export function formatCountdown(target: Date, now: Date): string {
  const remaining = target.getTime() - now.getTime()
  if (remaining <= MINUTE) return 'any moment now'
  if (remaining >= 2 * DAY) return `in ${Math.floor(remaining / DAY)} days`
  if (remaining >= HOUR) {
    const hours = Math.floor(remaining / HOUR)
    const minutes = Math.floor((remaining % HOUR) / MINUTE)
    return `in ${hours} h ${minutes} m`
  }
  const minutes = Math.ceil(remaining / MINUTE)
  return `in ${minutes} minutes`
}
