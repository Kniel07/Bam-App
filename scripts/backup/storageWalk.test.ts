import { describe, expect, it } from 'vitest'
import { contentTypeFor, listAllPaths, type StorageEntry } from './storageWalk'

const file = (name: string): StorageEntry => ({ name, id: `id-${name}` })
const folder = (name: string): StorageEntry => ({ name, id: null })

describe('listAllPaths', () => {
  it('walks module/row folders and follows pagination', async () => {
    const many = Array.from({ length: 130 }, (_, index) => folder(`row${index}`))
    const tree: Record<string, StorageEntry[]> = {
      '': [folder('memories'), folder('story')],
      memories: many,
      story: [folder('m1')],
      'story/m1': [file('a.webp'), file('.emptyFolderPlaceholder')],
    }
    for (let index = 0; index < 130; index += 1) tree[`memories/row${index}`] = [file('p.webp')]

    const calls: string[] = []
    const paths = await listAllPaths(async (prefix, offset, limit) => {
      calls.push(`${prefix}@${offset}`)
      return (tree[prefix] ?? []).slice(offset, offset + limit)
    })

    expect(paths).toHaveLength(131)
    expect(paths).toContain('memories/row129/p.webp')
    expect(paths).toContain('story/m1/a.webp')
    expect(paths).not.toContain('story/m1/.emptyFolderPlaceholder')
    expect(calls).toContain('memories@100')
  })
})

describe('contentTypeFor', () => {
  it('maps our upload formats', () => {
    expect(contentTypeFor('memories/x/a.webp')).toBe('image/webp')
    expect(contentTypeFor('story/x/a.JPG')).toBe('image/jpeg')
    expect(contentTypeFor('x/unknown.bin')).toBe('application/octet-stream')
  })
})
