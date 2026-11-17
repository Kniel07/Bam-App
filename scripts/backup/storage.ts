/**
 * Photo backup/restore for the private `media` bucket (TD-013).
 *
 *   tsx scripts/backup/storage.ts download <dir>   (backup.sh, in CI)
 *   tsx scripts/backup/storage.ts upload <dir>     (restore.sh, on the owner's computer)
 *
 * Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (secret key) in the environment.
 * Prints counts only, never paths (logs of a public repository are public).
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative, sep } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { contentTypeFor, listAllPaths } from './storageWalk'

const BUCKET = 'media'

function fail(message: string): never {
  console.error(`✖ ${message}`)
  process.exit(1)
}

const [command, dir] = process.argv.slice(2)
if ((command !== 'download' && command !== 'upload') || !dir) fail('usage: storage.ts download|upload <dir>')
const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) fail('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

const storage = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from(BUCKET)

async function download(target: string) {
  const paths = await listAllPaths(async (prefix, offset, limit) => {
    const { data, error } = await storage.list(prefix, { offset, limit, sortBy: { column: 'name', order: 'asc' } })
    if (error) fail(`Could not list photos: ${error.message}`)
    return data
  })
  let bytes = 0
  for (const path of paths) {
    const { data, error } = await storage.download(path)
    if (error || !data) fail(`Could not download a photo (${error?.message ?? 'empty'})`)
    const buffer = Buffer.from(await data.arrayBuffer())
    const destination = join(target, ...path.split('/'))
    await mkdir(dirname(destination), { recursive: true })
    await writeFile(destination, buffer, { mode: 0o600 })
    bytes += buffer.length
  }
  console.warn(`Downloaded ${paths.length} photos (${(bytes / 1024 / 1024).toFixed(1)} MB).`)
}

async function filesUnder(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true, recursive: true })
  return entries.filter((entry) => entry.isFile()).map((entry) => join(entry.parentPath, entry.name))
}

async function upload(source: string) {
  const files = await filesUnder(source)
  for (const file of files) {
    const path = relative(source, file).split(sep).join('/')
    const { error } = await storage.upload(path, await readFile(file), { contentType: contentTypeFor(path), upsert: true })
    if (error) fail(`Could not upload a photo (${error.message})`)
  }
  console.warn(`Uploaded ${files.length} photos.`)
}

await (command === 'download' ? download(dir) : upload(dir))
