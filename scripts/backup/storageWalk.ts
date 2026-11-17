/** One entry of Supabase Storage `list()`: folders come back with `id: null`. */
export interface StorageEntry {
  name: string
  id: string | null
}

export type ListFolder = (prefix: string, offset: number, limit: number) => Promise<StorageEntry[]>

const PAGE_SIZE = 100

/** Every file path in the bucket, depth-first, following pagination. */
export async function listAllPaths(list: ListFolder, prefix = ''): Promise<string[]> {
  const paths: string[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const entries = await list(prefix, offset, PAGE_SIZE)
    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.id === null) paths.push(...(await listAllPaths(list, path)))
      else if (entry.name !== '.emptyFolderPlaceholder') paths.push(path)
    }
    if (entries.length < PAGE_SIZE) return paths
  }
}

/** Content type for re-upload, from the extension our uploader uses. */
export function contentTypeFor(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase()
  if (extension === 'webp') return 'image/webp'
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg'
  if (extension === 'png') return 'image/png'
  return 'application/octet-stream'
}
