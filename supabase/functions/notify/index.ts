// Supabase Edge Function `notify` (Deno). CR-04 Phase A.
//
// Called every minute by Supabase Cron, and right after a nudge is sent (CR-05)
// for instant delivery. Claims due events in the database
// (exactly once each) and sends a Web Push to every device of each recipient.
// Safe to call by anyone holding the public anon key: it only delivers what is
// due, and the database guarantees each event is sent once.
//
// Secrets (Supabase → Edge Functions → Secrets), never in git:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (https://<site> or mailto:)
// Provided automatically by Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2.119.0'

type Kind =
  | 'letter_unlocked'
  | 'monthsary'
  | 'nudge_miss_you'
  | 'nudge_thinking_of_you'
  | 'nudge_hug'
  | 'nudge_good_night'
  | 'test'

interface ClaimedEvent {
  event_key: string
  user_id: string
  kind: Kind
  url: string
}

// Generic on purpose: the lock screen never shows content, labels or names (CR-04 §4).
// Nudge texts are fixed phrases, never user-written content (CR-05).
const MESSAGES: Record<Kind, { title: string; body: string }> = {
  letter_unlocked: { title: 'Our Little Universe', body: 'A letter just unlocked for you 💌' },
  monthsary: { title: 'Our Little Universe', body: 'Happy monthsary 💗 Something is waiting for you.' },
  nudge_miss_you: { title: 'Our Little Universe', body: '💗 I miss you' },
  nudge_thinking_of_you: { title: 'Our Little Universe', body: '💭 Thinking of you' },
  nudge_hug: { title: 'Our Little Universe', body: '🤗 Sending you a hug' },
  nudge_good_night: { title: 'Our Little Universe', body: '🌙 Good night' },
  test: { title: 'Our Little Universe', body: '🔔 Test notification: it works on this phone!' },
}

// The app calls this function from the browser after sending a nudge.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing secret ${name}`)
  return value
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  try {
    const supabase = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    webpush.setVapidDetails(requireEnv('VAPID_SUBJECT'), requireEnv('VAPID_PUBLIC_KEY'), requireEnv('VAPID_PRIVATE_KEY'))

    const { data: events, error } = await supabase.rpc('claim_due_notifications')
    if (error) throw new Error(`claim failed: ${error.message}`)

    let sent = 0
    let removed = 0
    let noDevice = 0
    // Push-service status codes of failed sends (e.g. 403 = VAPID key mismatch). Diagnostics only.
    const failedStatuses: number[] = []
    for (const event of (events ?? []) as ClaimedEvent[]) {
      const { data: devices, error: devicesError } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_id', event.user_id)
      if (devicesError) throw new Error(`device lookup failed: ${devicesError.message}`)

      if (!devices || devices.length === 0) noDevice += 1
      const message = MESSAGES[event.kind]
      if (!message) continue // unknown kind from a newer database: skip rather than fail
      const payload = JSON.stringify({ ...message, url: event.url, tag: event.event_key })
      for (const device of devices ?? []) {
        try {
          await webpush.sendNotification(
            { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
            payload,
            { TTL: 60 * 60 * 12, urgency: 'high' },
          )
          sent += 1
        } catch (sendError) {
          const status = (sendError as { statusCode?: number }).statusCode
          if (status === 404 || status === 410) {
            // The phone unsubscribed or the app was uninstalled: forget the device.
            await supabase.from('push_subscriptions').delete().eq('id', device.id)
            removed += 1
          } else {
            failedStatuses.push(status ?? 0)
            console.error(`push failed (status ${status ?? 'unknown'})`)
          }
        }
      }
    }

    // Counts and status codes only: never endpoints, keys or user ids.
    // Visible in net._http_response.content for the every-minute calls.
    return Response.json(
      { events: events?.length ?? 0, sent, removed, noDevice, failedStatuses },
      { headers: CORS_HEADERS },
    )
  } catch (failure) {
    // Our own error messages name the missing secret or failing step, never a value.
    const reason = failure instanceof Error ? failure.message : 'unknown'
    console.error(reason)
    return Response.json({ error: 'notify failed', reason }, { status: 500, headers: CORS_HEADERS })
  }
})
