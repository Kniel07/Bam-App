import type { Letter } from './api'

/**
 * How an envelope looks (PAGE-STRUCTURE §4.6). Display only: whether content
 * can actually be read is decided by the database clock in open_letter().
 */
export type EnvelopeState = 'draft' | 'locked' | 'new' | 'sealed' | 'opened'

export function isLetterAvailable(letter: Letter, now: Date): boolean {
  if (letter.status !== 'published') return false
  if (letter.unlock_type === 'on_demand') return true
  return letter.unlock_at !== null && new Date(letter.unlock_at).getTime() <= now.getTime()
}

export function getEnvelopeState(letter: Letter, now: Date): EnvelopeState {
  if (letter.status === 'draft') return 'draft'
  if (!isLetterAvailable(letter, now)) return 'locked'
  if (letter.first_opened_at) return 'opened'
  // A scheduled letter that has just become available is "new"; on-demand ones are simply sealed.
  return letter.unlock_type === 'scheduled' ? 'new' : 'sealed'
}

const STATE_ORDER: Record<EnvelopeState, number> = { new: 0, sealed: 1, locked: 2, opened: 3, draft: 4 }

/**
 * Newly unlocked & unread first → available unopened → locked (soonest first)
 * → opened → drafts (owner only). Ties keep the owner's sort order.
 */
export function sortEnvelopes(letters: Letter[], now: Date): Letter[] {
  return [...letters]
    .map((letter, index) => ({ letter, index, state: getEnvelopeState(letter, now) }))
    .sort((a, b) => {
      const byState = STATE_ORDER[a.state] - STATE_ORDER[b.state]
      if (byState !== 0) return byState
      if (a.state === 'locked' && a.letter.unlock_at && b.letter.unlock_at) {
        return new Date(a.letter.unlock_at).getTime() - new Date(b.letter.unlock_at).getTime()
      }
      return a.index - b.index
    })
    .map(({ letter }) => letter)
}

/** Letters she can open now but hasn't yet ("Waiting for you" on Home). */
export function getUnreadAvailableLetters(letters: Letter[], now: Date): Letter[] {
  return sortEnvelopes(letters, now).filter((letter) => {
    const state = getEnvelopeState(letter, now)
    return state === 'new' || state === 'sealed'
  })
}
