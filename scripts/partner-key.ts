/**
 * Partner QR key tool — run ONLY on the owner's own computer (FR-AUTH-11/12, F12).
 *
 *   npm run partner-key -- create   first time: creates the partner account + QR
 *   npm run partner-key -- rotate   new key: old QR stops working, her sessions end
 *
 * Reads from .env.local (never committed):
 *   VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_URL (https://<project>.vercel.app)
 *
 * Writes the QR image to ./private/ (gitignored). The secret is never printed,
 * logged, or stored anywhere else; the database keeps only its bcrypt hash.
 */
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'
import { KEY_ROUTE, PARTNER_KEY_LENGTH, PARTNER_LOGIN_ADDRESS } from '../src/lib/constants'

type Command = 'create' | 'rotate'

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`)
  process.exit(1)
}

function readConfig() {
  if (existsSync('.env.local')) process.loadEnvFile('.env.local')
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const appUrl = process.env.APP_URL
  if (!supabaseUrl || !serviceRoleKey || !appUrl) {
    fail('Missing VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or APP_URL in .env.local')
  }
  const parsedAppUrl = new URL(appUrl)
  if (parsedAppUrl.protocol !== 'https:' && parsedAppUrl.hostname !== 'localhost') {
    fail('APP_URL must use https:// (the key would otherwise travel unencrypted)')
  }
  return { supabaseUrl, serviceRoleKey, appUrl: parsedAppUrl.origin }
}

function generateSecret(): string {
  const secret = randomBytes(32).toString('base64url')
  if (secret.length !== PARTNER_KEY_LENGTH) fail('Unexpected key length')
  return secret
}

async function findPartnerUserId(admin: SupabaseClient): Promise<string | null> {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 })
    if (error) fail(`Could not list users: ${error.message}`)
    const match = data.users.find((user) => user.email === PARTNER_LOGIN_ADDRESS)
    if (match) return match.id
    if (data.users.length < 100) return null
  }
  return null
}

async function writeQrCode(appUrl: string, secret: string): Promise<string> {
  mkdirSync('private', { recursive: true })
  const stamp = new Date().toISOString().slice(0, 10)
  const filePath = join('private', `partner-key-${stamp}.png`)
  await QRCode.toFile(filePath, `${appUrl}${KEY_ROUTE}#k=${secret}`, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 1024,
    color: { dark: '#4A3B40', light: '#FFF8F3' },
  })
  return filePath
}

async function main() {
  const command = process.argv[2] as Command | undefined
  if (command !== 'create' && command !== 'rotate') fail('Usage: npm run partner-key -- <create|rotate>')

  const { supabaseUrl, serviceRoleKey, appUrl } = readConfig()
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const secret = generateSecret()
  const existingId = await findPartnerUserId(admin)

  if (command === 'create') {
    if (existingId) fail('The partner account already exists. Use "rotate" to issue a new key.')
    const { data, error } = await admin.auth.admin.createUser({
      email: PARTNER_LOGIN_ADDRESS,
      password: secret,
      email_confirm: true,
    })
    if (error) fail(`Could not create the partner account: ${error.message}`)
    console.warn(`✔ Partner account created (user id ${data.user.id}).`)
    console.warn('  Next: add her to relationship_members (supabase/provisioning.example.sql).')
  } else {
    if (!existingId) fail('No partner account found. Run "create" first.')
    const { error } = await admin.auth.admin.updateUserById(existingId, { password: secret })
    if (error) fail(`Could not rotate the key: ${error.message}`)
    const { data: revoked, error: revokeError } = await admin.rpc('revoke_partner_sessions')
    if (revokeError) fail(`Key rotated, but sessions were not revoked: ${revokeError.message}`)
    console.warn(`✔ Key rotated. Ended ${String(revoked)} existing partner session(s).`)
  }

  const filePath = await writeQrCode(appUrl, secret)
  console.warn(`✔ QR code saved to ${filePath}`)
  console.warn(
    command === 'rotate'
      ? '  Print it or send it privately. Delete old copies: the previous key no longer works.'
      : '  Keep it private: anyone with this image can enter as her.',
  )
}

void main()
