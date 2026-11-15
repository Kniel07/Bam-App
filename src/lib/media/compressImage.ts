import { MAX_IMAGE_DIMENSION } from '@/lib/constants'

/** Largest original we accept before compression (phones can produce big files). */
export const MAX_ORIGINAL_BYTES = 30 * 1024 * 1024
const WEBP_QUALITY = 0.82
const JPEG_QUALITY = 0.85

export class ImageProcessingError extends Error {
  constructor(readonly reason: 'not-an-image' | 'too-large' | 'unreadable') {
    super(reason)
    this.name = 'ImageProcessingError'
  }
}

/** Scales (width, height) to fit within `maxDimension`, preserving aspect ratio. */
export function fitWithin(width: number, height: number, maxDimension = MAX_IMAGE_DIMENSION) {
  const longest = Math.max(width, height)
  if (longest <= maxDimension) return { width, height }
  const scale = maxDimension / longest
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

export interface CompressedImage {
  blob: Blob
  extension: 'webp' | 'jpg'
  width: number
  height: number
}

/**
 * Resizes and re-encodes a photo in the browser before upload (TD-010, NFR-09).
 * Re-encoding also drops EXIF metadata such as GPS location (SEC-08).
 */
export async function compressImage(file: File): Promise<CompressedImage> {
  if (!file.type.startsWith('image/')) throw new ImageProcessingError('not-an-image')
  if (file.size > MAX_ORIGINAL_BYTES) throw new ImageProcessingError('too-large')

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new ImageProcessingError('unreadable') // e.g. HEIC in a browser that can't decode it
  }

  const { width, height } = fitWithin(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new ImageProcessingError('unreadable')
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  // WebP where supported; browsers silently fall back to PNG otherwise, so check.
  const webp = await canvasToBlob(canvas, 'image/webp', WEBP_QUALITY)
  if (webp && webp.type === 'image/webp') return { blob: webp, extension: 'webp', width, height }
  const jpeg = await canvasToBlob(canvas, 'image/jpeg', JPEG_QUALITY)
  if (!jpeg) throw new ImageProcessingError('unreadable')
  return { blob: jpeg, extension: 'jpg', width, height }
}
