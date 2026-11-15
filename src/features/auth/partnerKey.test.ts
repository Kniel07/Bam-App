import { parsePartnerKeyFragment } from './partnerKey'

const VALID_KEY = 'a'.repeat(21) + '-_' + 'Z9'.repeat(10) // 43 base64url chars

describe('parsePartnerKeyFragment', () => {
  it('reads a well-formed key with or without the leading #', () => {
    expect(parsePartnerKeyFragment(`#k=${VALID_KEY}`)).toBe(VALID_KEY)
    expect(parsePartnerKeyFragment(`k=${VALID_KEY}`)).toBe(VALID_KEY)
  })

  it('rejects missing, empty, or differently named parameters', () => {
    expect(parsePartnerKeyFragment('')).toBeNull()
    expect(parsePartnerKeyFragment('#')).toBeNull()
    expect(parsePartnerKeyFragment('#k=')).toBeNull()
    expect(parsePartnerKeyFragment(`#key=${VALID_KEY}`)).toBeNull()
  })

  it('rejects keys of the wrong length', () => {
    expect(parsePartnerKeyFragment(`#k=${VALID_KEY.slice(1)}`)).toBeNull()
    expect(parsePartnerKeyFragment(`#k=${VALID_KEY}x`)).toBeNull()
  })

  it('rejects characters outside base64url', () => {
    expect(parsePartnerKeyFragment(`#k=${VALID_KEY.slice(1)}+`)).toBeNull()
    expect(parsePartnerKeyFragment(`#k=${VALID_KEY.slice(1)}/`)).toBeNull()
    expect(parsePartnerKeyFragment(`#k=${VALID_KEY.slice(3)}%20x`)).toBeNull()
  })
})
