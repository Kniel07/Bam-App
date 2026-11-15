import { compressImage, fitWithin, ImageProcessingError, MAX_ORIGINAL_BYTES } from './compressImage'

describe('fitWithin', () => {
  it('leaves images within the limit untouched', () => {
    expect(fitWithin(1200, 800, 2048)).toEqual({ width: 1200, height: 800 })
    expect(fitWithin(2048, 2048, 2048)).toEqual({ width: 2048, height: 2048 })
  })
  it('scales landscape and portrait by the longest edge', () => {
    expect(fitWithin(4000, 3000, 2048)).toEqual({ width: 2048, height: 1536 })
    expect(fitWithin(3024, 4032, 2048)).toEqual({ width: 1536, height: 2048 })
  })
})

describe('compressImage input validation', () => {
  it('rejects non-images', async () => {
    const file = new File(['hello'], 'note.txt', { type: 'text/plain' })
    await expect(compressImage(file)).rejects.toEqual(new ImageProcessingError('not-an-image'))
  })
  it('rejects oversized originals before decoding', async () => {
    const file = new File(['x'], 'huge.jpg', { type: 'image/jpeg' })
    Object.defineProperty(file, 'size', { value: MAX_ORIGINAL_BYTES + 1 })
    await expect(compressImage(file)).rejects.toEqual(new ImageProcessingError('too-large'))
  })
})
