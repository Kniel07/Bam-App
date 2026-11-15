import type { Letter } from './api'
import { getEnvelopeState, getUnreadAvailableLetters, isLetterAvailable, sortEnvelopes } from './logic'

const NOW = new Date('2025-05-01T12:00:00Z')
const hoursFromNow = (hours: number) => new Date(NOW.getTime() + hours * 3_600_000).toISOString()

function letter(id: string, overrides: Partial<Letter> = {}): Letter {
  return {
    id,
    label: id,
    unlock_type: 'on_demand',
    unlock_at: null,
    status: 'published',
    sort_order: 0,
    first_opened_at: null,
    created_by: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

describe('envelope state', () => {
  it('treats drafts as drafts regardless of dates', () => {
    expect(getEnvelopeState(letter('d', { status: 'draft' }), NOW)).toBe('draft')
    expect(isLetterAvailable(letter('d', { status: 'draft' }), NOW)).toBe(false)
  })
  it('on-demand letters are sealed until opened', () => {
    expect(getEnvelopeState(letter('a'), NOW)).toBe('sealed')
    expect(getEnvelopeState(letter('a', { first_opened_at: hoursFromNow(-1) }), NOW)).toBe('opened')
  })
  it('scheduled letters are locked before, new at, and opened after reading', () => {
    expect(getEnvelopeState(letter('s', { unlock_type: 'scheduled', unlock_at: hoursFromNow(1) }), NOW)).toBe('locked')
    expect(getEnvelopeState(letter('s', { unlock_type: 'scheduled', unlock_at: NOW.toISOString() }), NOW)).toBe('new')
    expect(
      getEnvelopeState(letter('s', { unlock_type: 'scheduled', unlock_at: hoursFromNow(-2), first_opened_at: hoursFromNow(-1) }), NOW),
    ).toBe('opened')
  })
})

describe('sortEnvelopes', () => {
  it('orders new → sealed → locked (soonest first) → opened → draft', () => {
    const letters = [
      letter('draft', { status: 'draft' }),
      letter('opened', { first_opened_at: hoursFromNow(-1) }),
      letter('locked-later', { unlock_type: 'scheduled', unlock_at: hoursFromNow(48) }),
      letter('sealed'),
      letter('locked-soon', { unlock_type: 'scheduled', unlock_at: hoursFromNow(2) }),
      letter('new', { unlock_type: 'scheduled', unlock_at: hoursFromNow(-1) }),
    ]
    expect(sortEnvelopes(letters, NOW).map((item) => item.id)).toEqual([
      'new', 'sealed', 'locked-soon', 'locked-later', 'opened', 'draft',
    ])
  })
  it('keeps the owner order within the same state', () => {
    expect(sortEnvelopes([letter('b'), letter('a')], NOW).map((item) => item.id)).toEqual(['b', 'a'])
  })
})

describe('getUnreadAvailableLetters', () => {
  const ME = 'me'
  const THEM = 'them'
  it('returns only letters for me that can be opened and are unread', () => {
    const letters = [
      letter('sealed', { created_by: THEM }),
      letter('opened', { created_by: THEM, first_opened_at: hoursFromNow(-1) }),
      letter('locked', { created_by: THEM, unlock_type: 'scheduled', unlock_at: hoursFromNow(5) }),
      letter('new', { created_by: THEM, unlock_type: 'scheduled', unlock_at: hoursFromNow(-5) }),
      letter('draft', { created_by: THEM, status: 'draft' }),
      letter('mine', { created_by: ME }),
    ]
    expect(getUnreadAvailableLetters(letters, NOW, ME).map((item) => item.id)).toEqual(['new', 'sealed'])
  })
  it('returns nothing when signed out', () => {
    expect(getUnreadAvailableLetters([letter('a', { created_by: THEM })], NOW, null)).toEqual([])
  })
})
