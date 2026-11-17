import { formatReasonNumber, pickRandomReason, type Reason } from './reasonsApi'

const reason = (id: string): Reason => ({ id, number: 1, body: id, created_by: 'x', created_at: '', updated_at: '' })

describe('reasons jar helpers', () => {
  it('never repeats the previous reason when there is a choice', () => {
    const reasons = [reason('a'), reason('b')]
    for (let index = 0; index < 20; index += 1) expect(pickRandomReason(reasons, 'a')?.id).toBe('b')
  })
  it('returns the only reason even if it was just shown', () => {
    expect(pickRandomReason([reason('a')], 'a')?.id).toBe('a')
  })
  it('handles an empty jar', () => {
    expect(pickRandomReason([], null)).toBeNull()
  })
  it('formats numbers like the original brief', () => {
    expect(formatReasonNumber(1)).toBe('Reason #001')
    expect(formatReasonNumber(14)).toBe('Reason #014')
    expect(formatReasonNumber(1234)).toBe('Reason #1234')
  })
})
