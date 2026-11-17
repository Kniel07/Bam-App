import { base64UrlToUint8Array } from './push'

describe('base64UrlToUint8Array', () => {
  it('decodes base64url without padding', () => {
    // "hello" → aGVsbG8 (base64url, no padding)
    expect(Array.from(base64UrlToUint8Array('aGVsbG8'))).toEqual([104, 101, 108, 108, 111])
  })
  it('maps URL-safe characters back to standard base64', () => {
    // bytes 0xfb 0xff → "-_8" in base64url ("+/8=" in base64)
    expect(Array.from(base64UrlToUint8Array('-_8'))).toEqual([0xfb, 0xff])
  })
  it('decodes a 65-byte uncompressed P-256 public key length', () => {
    const key = 'B' + 'A'.repeat(86) // 87 chars → 65 bytes
    expect(base64UrlToUint8Array(key)).toHaveLength(65)
  })
})
